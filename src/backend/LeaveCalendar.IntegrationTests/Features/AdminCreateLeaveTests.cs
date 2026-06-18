using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.IntegrationTests.Features;

public class AdminCreateLeaveTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private record CreateRequest(Guid EmployeeId, Guid LeaveTypeId, string StartDate, string EndDate,
        string? Description = null, string? Notes = null);
    private record CreateResponse(Guid Id, Guid EmployeeId, Guid LeaveTypeId, string StartDate, string EndDate,
        string? Description, string? Notes);

    private static readonly Guid AdminId         = Guid.Parse("22222222-0000-0000-0000-000000000001");
    private static readonly Guid EmployeeId      = Guid.Parse("22222222-0000-0000-0000-000000000002"); // Eddie Employee
    private static readonly Guid NoraId          = Guid.Parse("22222222-0000-0000-0000-000000000003");
    private static readonly Guid VacationTypeId  = Guid.Parse("11111111-0000-0000-0000-000000000001");
    private static readonly Guid PublicHolidayId = Guid.Parse("11111111-0000-0000-0000-000000000003");

    private async Task SeedRegistrationAsync(Guid id, Guid employeeId, DateOnly start, DateOnly end)
    {
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        ctx.LeaveRegistrations.Add(new LeaveRegistration
        {
            Id = id,
            EmployeeId = employeeId,
            LeaveTypeId = VacationTypeId,
            StartDate = start,
            EndDate = end
        });
        await ctx.SaveChangesAsync();
    }

    [Fact]
    public async Task AdminCreateLeave_employeeRole_returns_403()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var response = await client.PostAsJsonAsync("/api/admin/leave",
            new CreateRequest(EmployeeId, VacationTypeId, "2026-07-01", "2026-07-05"));
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AdminCreateLeave_withFutureDate_returns_201_and_persists()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.PostAsJsonAsync("/api/admin/leave",
            new CreateRequest(EmployeeId, VacationTypeId, "2026-07-01", "2026-07-05", "Summer", "admin notes"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<CreateResponse>();
        body.Should().NotBeNull();
        body!.EmployeeId.Should().Be(EmployeeId);
        body.LeaveTypeId.Should().Be(VacationTypeId);
        body.StartDate.Should().Be("2026-07-01");
        body.EndDate.Should().Be("2026-07-05");
        body.Description.Should().Be("Summer");
        body.Notes.Should().Be("admin notes");
        body.Id.Should().NotBeEmpty();

        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        var persisted = await ctx.LeaveRegistrations.FindAsync(body.Id);
        persisted.Should().NotBeNull();
        persisted!.EmployeeId.Should().Be(EmployeeId);
    }

    [Fact]
    public async Task AdminCreateLeave_withPastStartDate_returns_201()
    {
        // Admin is UNRESTRICTED — past dates are allowed
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.PostAsJsonAsync("/api/admin/leave",
            new CreateRequest(EmployeeId, VacationTypeId, "2026-06-01", "2026-06-05"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task AdminCreateLeave_publicHolidayType_returns_201()
    {
        // Admin may create Admin-only leave types
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.PostAsJsonAsync("/api/admin/leave",
            new CreateRequest(EmployeeId, PublicHolidayId, "2026-07-01", "2026-07-01"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task AdminCreateLeave_overlapWithExistingLeave_returns_422_OVERLAP()
    {
        await Factory.ResetAsync();
        await SeedRegistrationAsync(Guid.NewGuid(), EmployeeId, new DateOnly(2026, 7, 3), new DateOnly(2026, 7, 8));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PostAsJsonAsync("/api/admin/leave",
            new CreateRequest(EmployeeId, VacationTypeId, "2026-07-01", "2026-07-05"));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString().Should().Be("OVERLAP");
    }

    [Fact]
    public async Task AdminCreateLeave_endDateBeforeStartDate_returns_400()
    {
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PostAsJsonAsync("/api/admin/leave",
            new CreateRequest(EmployeeId, VacationTypeId, "2026-07-10", "2026-07-01"));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AdminCreateLeave_unknownEmployeeId_returns_404()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PostAsJsonAsync("/api/admin/leave",
            new CreateRequest(Guid.NewGuid(), VacationTypeId, "2026-07-01", "2026-07-05"));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AdminCreateLeave_unknownLeaveTypeId_returns_404()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PostAsJsonAsync("/api/admin/leave",
            new CreateRequest(EmployeeId, Guid.NewGuid(), "2026-07-01", "2026-07-05"));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AdminCreateLeave_emptyEmployeeId_returns_400()
    {
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PostAsJsonAsync("/api/admin/leave",
            new CreateRequest(Guid.Empty, VacationTypeId, "2026-07-01", "2026-07-05"));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
