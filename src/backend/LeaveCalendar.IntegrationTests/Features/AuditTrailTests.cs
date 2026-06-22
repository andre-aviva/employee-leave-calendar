using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Auditing;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LeaveCalendar.IntegrationTests.Features;

public class AuditTrailTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private static readonly Guid AdminId    = Guid.Parse("22222222-0000-0000-0000-000000000001");
    private static readonly Guid EddieId    = Guid.Parse("22222222-0000-0000-0000-000000000002");
    private static readonly Guid Vacation   = Guid.Parse("11111111-0000-0000-0000-000000000001");
    private static readonly Guid SickLeave  = Guid.Parse("11111111-0000-0000-0000-000000000002");

    private record EditRequest(Guid LeaveTypeId, string StartDate, string EndDate,
        string? Description = null, string? Notes = null);

    // Adds a registration straight through the DbContext (no HTTP request → System actor),
    // mirroring the existing SeedRegistrationAsync helpers.
    private async Task<Guid> SeedRegistrationAsync(Guid employeeId, DateOnly start, DateOnly end)
    {
        var id = Guid.NewGuid();
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        ctx.LeaveRegistrations.Add(new LeaveRegistration
        {
            Id = id, EmployeeId = employeeId, LeaveTypeId = Vacation, StartDate = start, EndDate = end
        });
        await ctx.SaveChangesAsync();
        return id;
    }

    private async Task<List<AuditLogEntry>> AuditRowsAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        return await ctx.AuditLog.OrderBy(x => x.OccurredAt).ToListAsync();
    }

    [Fact]
    public async Task DirectDbWrite_records_a_System_Insert()
    {
        await Factory.ResetAsync();

        var regId = await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));

        var rows = await AuditRowsAsync();
        rows.Should().ContainSingle();
        var row = rows[0];
        row.Action.Should().Be(AuditAction.Insert);
        row.EntityId.Should().Be(regId);
        row.SubjectEmployeeId.Should().Be(EddieId);
        row.ActorEmployeeId.Should().BeNull();
        row.ActorName.Should().Be("System");
        row.ActorRole.Should().Be("System");
    }

    [Fact]
    public async Task AdminEdit_records_an_Update_attributed_to_the_admin()
    {
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PutAsJsonAsync($"/api/admin/leave/{regId}",
            new EditRequest(SickLeave, "2026-07-10", "2026-07-15"));
        response.EnsureSuccessStatusCode();

        var update = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Update);
        update.EntityId.Should().Be(regId);
        update.SubjectEmployeeId.Should().Be(EddieId);   // whose leave
        update.ActorEmployeeId.Should().Be(AdminId);     // who changed it (≠ subject)
        update.ActorName.Should().Be("Alice Admin");
        update.ActorRole.Should().Be("Admin");

        using var changes = JsonDocument.Parse(update.Changes);
        changes.RootElement.TryGetProperty("StartDate", out _).Should().BeTrue();
        changes.RootElement.TryGetProperty("EndDate", out _).Should().BeTrue();
        changes.RootElement.TryGetProperty("LeaveTypeId", out _).Should().BeTrue();
    }

    [Fact]
    public async Task FailedWrite_rolls_back_both_the_mutation_and_its_audit_row()
    {
        await Factory.ResetAsync();
        // A is valid. B overlaps A for the same employee → violates the DB exclusion constraint
        // on SaveChanges. Both B and B's audit row must roll back together (same transaction).
        await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 10));

        using (var scope = Factory.Services.CreateScope())
        {
            var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
            ctx.LeaveRegistrations.Add(new LeaveRegistration
            {
                Id = Guid.NewGuid(), EmployeeId = EddieId, LeaveTypeId = Vacation,
                StartDate = new DateOnly(2026, 7, 5), EndDate = new DateOnly(2026, 7, 8)   // overlaps A
            });
            var act = async () => await ctx.SaveChangesAsync();
            await act.Should().ThrowAsync<DbUpdateException>();
        }

        using var verify = Factory.Services.CreateScope();
        var db = verify.ServiceProvider.GetRequiredService<LeaveDbContext>();
        (await db.LeaveRegistrations.CountAsync()).Should().Be(1);  // only A
        (await db.AuditLog.CountAsync()).Should().Be(1);            // only A's Insert; B's rolled back
    }

    [Fact]
    public async Task AdminCreate_records_an_Insert_attributed_to_the_admin()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.PostAsJsonAsync("/api/admin/leave", new
        {
            EmployeeId = EddieId, LeaveTypeId = Vacation,
            StartDate = "2026-07-01", EndDate = "2026-07-05", Description = (string?)null, Notes = (string?)null
        });
        response.EnsureSuccessStatusCode();

        var insert = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Insert);
        insert.SubjectEmployeeId.Should().Be(EddieId);
        insert.ActorEmployeeId.Should().Be(AdminId);
    }

    [Fact]
    public async Task AdminDelete_records_a_Delete_attributed_to_the_admin()
    {
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.DeleteAsync($"/api/admin/leave/{regId}");
        response.EnsureSuccessStatusCode();

        var delete = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Delete);
        delete.EntityId.Should().Be(regId);
        delete.SubjectEmployeeId.Should().Be(EddieId);
        delete.ActorEmployeeId.Should().Be(AdminId);
    }

    [Fact]
    public async Task SelfRegister_records_an_Insert_where_actor_equals_subject()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PostAsJsonAsync("/api/me/leave", new
        {
            LeaveTypeId = Vacation, StartDate = "2026-07-01", EndDate = "2026-07-05",
            Description = (string?)null, Notes = (string?)null
        });
        response.EnsureSuccessStatusCode();

        var insert = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Insert);
        insert.SubjectEmployeeId.Should().Be(EddieId);
        insert.ActorEmployeeId.Should().Be(EddieId);   // actor == subject for self-service
        insert.ActorRole.Should().Be("Employee");
    }

    [Fact]
    public async Task SelfEdit_records_an_Update_where_actor_equals_subject()
    {
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PutAsJsonAsync($"/api/me/leave/{regId}",
            new EditRequest(Vacation, "2026-07-02", "2026-07-06"));
        response.EnsureSuccessStatusCode();

        var update = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Update);
        update.EntityId.Should().Be(regId);
        update.ActorEmployeeId.Should().Be(EddieId);
        update.SubjectEmployeeId.Should().Be(EddieId);
        update.ActorRole.Should().Be("Employee");
    }

    [Fact]
    public async Task SelfDelete_records_a_Delete_where_actor_equals_subject()
    {
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.DeleteAsync($"/api/me/leave/{regId}");
        response.EnsureSuccessStatusCode();

        var delete = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Delete);
        delete.EntityId.Should().Be(regId);
        delete.ActorEmployeeId.Should().Be(EddieId);
        delete.SubjectEmployeeId.Should().Be(EddieId);
        delete.ActorRole.Should().Be("Employee");
    }

    [Fact]
    public async Task Notes_content_is_redacted_in_the_audit_change_set()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        const string secret = "diagnosis confidential detail";

        var response = await client.PostAsJsonAsync("/api/admin/leave", new
        {
            EmployeeId = EddieId, LeaveTypeId = Vacation,
            StartDate = "2026-07-01", EndDate = "2026-07-05",
            Description = (string?)null, Notes = secret
        });
        response.EnsureSuccessStatusCode();

        var insert = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Insert);
        insert.Changes.Should().NotContain(secret);   // verbatim PII never stored
        insert.Changes.Should().Contain("[redacted]"); // but the field is recorded as present/changed
    }
}
