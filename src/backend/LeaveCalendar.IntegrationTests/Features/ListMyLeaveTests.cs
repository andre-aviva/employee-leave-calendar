using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.IntegrationTests.Features;

public class ListMyLeaveTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private record MyLeaveDto(
        Guid Id,
        Guid LeaveTypeId,
        string LeaveTypeName,
        string ColourHex,
        string StartDate,
        string EndDate,
        string? Description,
        string? Notes);

    // Seeded GUIDs from DbSeeder
    private static readonly Guid EmployeeId = Guid.Parse("22222222-0000-0000-0000-000000000002"); // Eddie Employee
    private static readonly Guid NoraId     = Guid.Parse("22222222-0000-0000-0000-000000000003"); // Nora Newbie
    private static readonly Guid VacationTypeId = Guid.Parse("11111111-0000-0000-0000-000000000001");

    private async Task SeedRegistrationAsync(Guid id, Guid employeeId, DateOnly start, DateOnly end, string? description = null)
    {
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        ctx.LeaveRegistrations.Add(new LeaveRegistration
        {
            Id = id,
            EmployeeId = employeeId,
            LeaveTypeId = VacationTypeId,
            StartDate = start,
            EndDate = end,
            Description = description
        });
        await ctx.SaveChangesAsync();
    }

    [Fact]
    public async Task ListMyLeave_anonymous_returns_401()
    {
        var response = await Client.GetAsync("/api/me/leave");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ListMyLeave_returnsOnlyCallersRegistrations()
    {
        await Factory.ResetAsync();

        var eddieLeaveId = Guid.NewGuid();
        var noraLeaveId  = Guid.NewGuid();

        // Seed one registration per employee
        await SeedRegistrationAsync(eddieLeaveId, EmployeeId,
            new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 15), "Eddie's leave");
        await SeedRegistrationAsync(noraLeaveId, NoraId,
            new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 5), "Nora's leave");

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var response = await client.GetAsync("/api/me/leave");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<MyLeaveDto>>();
        body.Should().NotBeNull();
        // Eddie should only see his own registration
        body!.Should().HaveCount(1);
        body[0].Id.Should().Be(eddieLeaveId);
        body[0].LeaveTypeId.Should().Be(VacationTypeId);
        body[0].LeaveTypeName.Should().Be("Vacation");
        body[0].ColourHex.Should().Be("#2E7D32");
        body[0].StartDate.Should().Be("2026-07-10");
        body[0].EndDate.Should().Be("2026-07-15");
        body[0].Description.Should().Be("Eddie's leave");
    }

    [Fact]
    public async Task ListMyLeave_returnsResultsSortedByStartDateDescending()
    {
        await Factory.ResetAsync();

        var earlierId = Guid.NewGuid();
        var laterId   = Guid.NewGuid();

        await SeedRegistrationAsync(earlierId, EmployeeId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));
        await SeedRegistrationAsync(laterId,   EmployeeId, new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 5));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var response = await client.GetAsync("/api/me/leave");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<MyLeaveDto>>();
        body.Should().NotBeNull();
        body!.Should().HaveCount(2);
        // Most recent first
        body[0].Id.Should().Be(laterId);
        body[1].Id.Should().Be(earlierId);
    }
}
