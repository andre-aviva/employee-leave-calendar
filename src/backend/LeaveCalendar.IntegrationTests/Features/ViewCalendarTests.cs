using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.IntegrationTests.Features;

public class ViewCalendarTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private record CalendarEntryDto(
        Guid Id,
        Guid EmployeeId,
        string EmployeeName,
        Guid LeaveTypeId,
        string LeaveTypeName,
        string ColourHex,
        string StartDate,
        string EndDate);

    // Seeded GUIDs from DbSeeder
    private static readonly Guid EmployeeId = Guid.Parse("22222222-0000-0000-0000-000000000002"); // Eddie Employee
    private static readonly Guid VacationTypeId = Guid.Parse("11111111-0000-0000-0000-000000000001");

    private async Task SeedRegistrationAsync(Guid id, Guid employeeId, Guid leaveTypeId, DateOnly start, DateOnly end)
    {
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        ctx.LeaveRegistrations.Add(new LeaveRegistration
        {
            Id = id,
            EmployeeId = employeeId,
            LeaveTypeId = leaveTypeId,
            StartDate = start,
            EndDate = end
        });
        await ctx.SaveChangesAsync();
    }

    [Fact]
    public async Task ViewCalendar_anonymous_returns_401()
    {
        var response = await Client.GetAsync("/api/calendar?from=2026-07-01&to=2026-07-31");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ViewCalendar_toBeforeFrom_returns_400()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.GetAsync("/api/calendar?from=2026-07-31&to=2026-07-01");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ViewCalendar_returnsOnlyRegistrationsIntersectingWindow()
    {
        await Factory.ResetAsync();

        var insideId = Guid.NewGuid();
        var outsideId = Guid.NewGuid();

        // Inside the window 2026-07-01..2026-07-31
        await SeedRegistrationAsync(insideId, EmployeeId, VacationTypeId,
            start: new DateOnly(2026, 7, 10),
            end: new DateOnly(2026, 7, 15));

        // Fully outside (August)
        await SeedRegistrationAsync(outsideId, EmployeeId, VacationTypeId,
            start: new DateOnly(2026, 8, 1),
            end: new DateOnly(2026, 8, 5));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var response = await client.GetAsync("/api/calendar?from=2026-07-01&to=2026-07-31");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<CalendarEntryDto>>();
        body.Should().NotBeNull();
        body!.Should().HaveCount(1);

        var entry = body[0];
        entry.Id.Should().Be(insideId);
        entry.EmployeeId.Should().Be(EmployeeId);
        entry.EmployeeName.Should().Be("Eddie Employee");
        entry.LeaveTypeId.Should().Be(VacationTypeId);
        entry.LeaveTypeName.Should().Be("Vacation");
        entry.ColourHex.Should().Be("#2E7D32");
        entry.StartDate.Should().Be("2026-07-10");
        entry.EndDate.Should().Be("2026-07-15");
    }

    [Fact]
    public async Task ViewCalendar_registrationSpanningMonthBoundary_isIncludedWhenWindowIsInside()
    {
        await Factory.ResetAsync();

        var spanningId = Guid.NewGuid();

        // Spans July-August boundary: 2026-07-28..2026-08-03
        await SeedRegistrationAsync(spanningId, EmployeeId, VacationTypeId,
            start: new DateOnly(2026, 7, 28),
            end: new DateOnly(2026, 8, 3));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        // Window is fully in July (inside the spanning leave)
        var response = await client.GetAsync("/api/calendar?from=2026-07-30&to=2026-07-31");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<CalendarEntryDto>>();
        body.Should().NotBeNull();
        body!.Should().ContainSingle(e => e.Id == spanningId);

        var entry = body[0];
        entry.Id.Should().Be(spanningId);
        entry.EmployeeId.Should().Be(EmployeeId);
        entry.EmployeeName.Should().Be("Eddie Employee");
        entry.LeaveTypeId.Should().Be(VacationTypeId);
        entry.LeaveTypeName.Should().Be("Vacation");
        entry.ColourHex.Should().Be("#2E7D32");
        entry.StartDate.Should().Be("2026-07-28");
        entry.EndDate.Should().Be("2026-08-03");
    }
}
