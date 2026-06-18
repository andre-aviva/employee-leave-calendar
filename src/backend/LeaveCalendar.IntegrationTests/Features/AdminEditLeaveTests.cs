using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.IntegrationTests.Features;

public class AdminEditLeaveTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private record EditRequest(Guid LeaveTypeId, string StartDate, string EndDate,
        string? Description = null, string? Notes = null);
    private record EditResponse(Guid Id, Guid EmployeeId, Guid LeaveTypeId, string StartDate, string EndDate,
        string? Description, string? Notes);

    private static readonly Guid EmployeeId      = Guid.Parse("22222222-0000-0000-0000-000000000002"); // Eddie Employee
    private static readonly Guid NoraId          = Guid.Parse("22222222-0000-0000-0000-000000000003"); // Nora Newbie
    private static readonly Guid VacationTypeId  = Guid.Parse("11111111-0000-0000-0000-000000000001");
    private static readonly Guid SickLeaveTypeId = Guid.Parse("11111111-0000-0000-0000-000000000002");

    private async Task<Guid> SeedRegistrationAsync(Guid employeeId, DateOnly start, DateOnly end, Guid? typeId = null)
    {
        var id = Guid.NewGuid();
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        ctx.LeaveRegistrations.Add(new LeaveRegistration
        {
            Id = id,
            EmployeeId = employeeId,
            LeaveTypeId = typeId ?? VacationTypeId,
            StartDate = start,
            EndDate = end
        });
        await ctx.SaveChangesAsync();
        return id;
    }

    [Fact]
    public async Task AdminEditLeave_employeeRole_returns_403()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var response = await client.PutAsJsonAsync($"/api/admin/leave/{Guid.NewGuid()}",
            new EditRequest(VacationTypeId, "2026-07-01", "2026-07-05"));
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AdminEditLeave_unknownId_returns_404()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PutAsJsonAsync($"/api/admin/leave/{Guid.NewGuid()}",
            new EditRequest(VacationTypeId, "2026-07-01", "2026-07-05"));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AdminEditLeave_futureDated_returns_200_and_persists()
    {
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EmployeeId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PutAsJsonAsync($"/api/admin/leave/{regId}",
            new EditRequest(SickLeaveTypeId, "2026-07-10", "2026-07-15", "updated", "admin note"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<EditResponse>();
        body.Should().NotBeNull();
        body!.Id.Should().Be(regId);
        body.EmployeeId.Should().Be(EmployeeId);
        body.LeaveTypeId.Should().Be(SickLeaveTypeId);
        body.StartDate.Should().Be("2026-07-10");
        body.EndDate.Should().Be("2026-07-15");
        body.Description.Should().Be("updated");

        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        var persisted = await ctx.LeaveRegistrations.FindAsync(regId);
        persisted!.StartDate.Should().Be(new DateOnly(2026, 7, 10));
        persisted.LeaveTypeId.Should().Be(SickLeaveTypeId);
    }

    [Fact]
    public async Task AdminEditLeave_pastDated_returns_200()
    {
        // Admin is UNRESTRICTED — may edit past-dated leave
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EmployeeId, new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 5));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PutAsJsonAsync($"/api/admin/leave/{regId}",
            new EditRequest(VacationTypeId, "2026-06-02", "2026-06-06"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AdminEditLeave_editAnyEmployeesLeave_returns_200()
    {
        // Admin can edit Nora's leave (not just Eddie's)
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(NoraId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PutAsJsonAsync($"/api/admin/leave/{regId}",
            new EditRequest(SickLeaveTypeId, "2026-07-10", "2026-07-12"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<EditResponse>();
        body!.EmployeeId.Should().Be(NoraId);
    }

    [Fact]
    public async Task AdminEditLeave_editInPlace_returns_200()
    {
        // Editing with the same dates (self-overlap excluded)
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EmployeeId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PutAsJsonAsync($"/api/admin/leave/{regId}",
            new EditRequest(VacationTypeId, "2026-07-01", "2026-07-05"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AdminEditLeave_overlapWithOtherLeave_returns_422_OVERLAP()
    {
        await Factory.ResetAsync();
        var regIdA = await SeedRegistrationAsync(EmployeeId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));
        var regIdB = await SeedRegistrationAsync(EmployeeId, new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 15));

        // Edit A to overlap B
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PutAsJsonAsync($"/api/admin/leave/{regIdA}",
            new EditRequest(VacationTypeId, "2026-07-08", "2026-07-12"));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString().Should().Be("OVERLAP");
    }
}
