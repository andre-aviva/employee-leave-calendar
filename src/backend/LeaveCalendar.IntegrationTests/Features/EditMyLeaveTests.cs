using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.IntegrationTests.Features;

public class EditMyLeaveTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private record EditRequest(Guid LeaveTypeId, string StartDate, string EndDate, string? Description = null, string? Notes = null);
    private record EditResponse(Guid Id, Guid LeaveTypeId, string StartDate, string EndDate, string? Description, string? Notes);

    // Seeded GUIDs from DbSeeder
    private static readonly Guid EmployeeId      = Guid.Parse("22222222-0000-0000-0000-000000000002"); // Eddie Employee
    private static readonly Guid NoraId          = Guid.Parse("22222222-0000-0000-0000-000000000003"); // Nora Newbie
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
    public async Task EditMyLeave_anonymous_returns_401()
    {
        var regId = Guid.NewGuid();
        var response = await Client.PutAsJsonAsync($"/api/me/leave/{regId}", new EditRequest(VacationTypeId, "2026-06-20", "2026-06-25"));
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task EditMyLeave_futureDatedLeave_with_valid_new_dates_returns_200_and_persists()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        await SeedRegistrationAsync(regId, EmployeeId, new DateOnly(2026, 6, 20), new DateOnly(2026, 6, 25));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PutAsJsonAsync($"/api/me/leave/{regId}",
            new EditRequest(VacationTypeId, "2026-06-22", "2026-06-28"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<EditResponse>();
        body.Should().NotBeNull();
        body!.Id.Should().Be(regId);
        body.StartDate.Should().Be("2026-06-22");
        body.EndDate.Should().Be("2026-06-28");

        // Verify persisted in DB
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        var persisted = await ctx.LeaveRegistrations.FindAsync(regId);
        persisted.Should().NotBeNull();
        persisted!.StartDate.Should().Be(new DateOnly(2026, 6, 22));
        persisted.EndDate.Should().Be(new DateOnly(2026, 6, 28));
    }

    [Fact]
    public async Task EditMyLeave_same_dates_edit_in_place_returns_200()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        await SeedRegistrationAsync(regId, EmployeeId, new DateOnly(2026, 6, 20), new DateOnly(2026, 6, 25));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        // PUT with exactly the same dates — must NOT be treated as self-overlap
        var response = await client.PutAsJsonAsync($"/api/me/leave/{regId}",
            new EditRequest(VacationTypeId, "2026-06-20", "2026-06-25"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task EditMyLeave_overlapping_another_registration_returns_422_OVERLAP()
    {
        await Factory.ResetAsync();
        var regIdA = Guid.NewGuid();
        var regIdB = Guid.NewGuid();
        // A: the one we're editing (2026-06-20..2026-06-25)
        await SeedRegistrationAsync(regIdA, EmployeeId, new DateOnly(2026, 6, 20), new DateOnly(2026, 6, 25));
        // B: a separate non-overlapping registration (2026-06-27..2026-06-30)
        await SeedRegistrationAsync(regIdB, EmployeeId, new DateOnly(2026, 6, 27), new DateOnly(2026, 6, 30));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        // Edit A to overlap B (2026-06-24..2026-06-28)
        var response = await client.PutAsJsonAsync($"/api/me/leave/{regIdA}",
            new EditRequest(VacationTypeId, "2026-06-24", "2026-06-28"));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString().Should().Be("OVERLAP");
    }

    [Fact]
    public async Task EditMyLeave_pastDatedLeave_returns_422_LEAVE_NOT_MODIFIABLE()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        // Start date is 2026-06-10, which is before FakeToday 2026-06-15
        await SeedRegistrationAsync(regId, EmployeeId, new DateOnly(2026, 6, 10), new DateOnly(2026, 6, 12));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PutAsJsonAsync($"/api/me/leave/{regId}",
            new EditRequest(VacationTypeId, "2026-06-20", "2026-06-25"));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString().Should().Be("LEAVE_NOT_MODIFIABLE");
    }

    [Fact]
    public async Task EditMyLeave_todayDatedLeave_returns_422_LEAVE_NOT_MODIFIABLE()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        // Start date equals FakeToday 2026-06-15 — editing a registration that starts today is not allowed
        await SeedRegistrationAsync(regId, EmployeeId, new DateOnly(2026, 6, 15), new DateOnly(2026, 6, 17));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PutAsJsonAsync($"/api/me/leave/{regId}",
            new EditRequest(VacationTypeId, "2026-06-20", "2026-06-25"));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString().Should().Be("LEAVE_NOT_MODIFIABLE");
    }

    [Fact]
    public async Task EditMyLeave_new_start_date_in_past_returns_422_START_DATE_IN_PAST()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        // Seed a future registration
        await SeedRegistrationAsync(regId, EmployeeId, new DateOnly(2026, 6, 20), new DateOnly(2026, 6, 25));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        // Request a past start date (before FakeToday 2026-06-15)
        var response = await client.PutAsJsonAsync($"/api/me/leave/{regId}",
            new EditRequest(VacationTypeId, "2026-06-10", "2026-06-12"));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString().Should().Be("START_DATE_IN_PAST");
    }

    [Fact]
    public async Task EditMyLeave_anotherEmployees_registration_returns_404()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        // Seed a registration for Nora, not Eddie
        await SeedRegistrationAsync(regId, NoraId, new DateOnly(2026, 6, 20), new DateOnly(2026, 6, 25));

        // Authenticate as Eddie (employee), not Nora
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PutAsJsonAsync($"/api/me/leave/{regId}",
            new EditRequest(VacationTypeId, "2026-06-20", "2026-06-25"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task EditMyLeave_changeToAdminOnlyType_returns_422_TYPE_NOT_REGISTERABLE()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        // Seed a future vacation registration for Eddie
        await SeedRegistrationAsync(regId, EmployeeId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        // Try to change to Public Holiday (Admin-only type)
        var response = await client.PutAsJsonAsync($"/api/me/leave/{regId}",
            new EditRequest(PublicHolidayId, "2026-07-01", "2026-07-05"));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString().Should().Be("TYPE_NOT_REGISTERABLE");
    }
}
