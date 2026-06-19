using System.Net;
using System.Text.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.IntegrationTests.Features;

public class DeleteMyLeaveTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    // Seeded GUIDs from DbSeeder
    private static readonly Guid EmployeeId     = Guid.Parse("22222222-0000-0000-0000-000000000002"); // Eddie Employee
    private static readonly Guid NoraId         = Guid.Parse("22222222-0000-0000-0000-000000000003"); // Nora Newbie
    private static readonly Guid VacationTypeId = Guid.Parse("11111111-0000-0000-0000-000000000001");

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
    public async Task DeleteMyLeave_anonymous_returns_401()
    {
        var regId = Guid.NewGuid();
        var response = await Client.DeleteAsync($"/api/me/leave/{regId}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DeleteMyLeave_ownFutureLeave_returns_204_and_goneFromDb()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        await SeedRegistrationAsync(regId, EmployeeId, new DateOnly(2026, 6, 20), new DateOnly(2026, 6, 25));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.DeleteAsync($"/api/me/leave/{regId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify it's gone from DB
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        var deleted = await ctx.LeaveRegistrations.FindAsync(regId);
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task DeleteMyLeave_ownPastLeave_returns_422_LEAVE_NOT_MODIFIABLE()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        // Start date 2026-06-10 is before FakeToday 2026-06-15
        await SeedRegistrationAsync(regId, EmployeeId, new DateOnly(2026, 6, 10), new DateOnly(2026, 6, 12));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.DeleteAsync($"/api/me/leave/{regId}");

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString().Should().Be("LEAVE_NOT_MODIFIABLE");
    }

    [Fact]
    public async Task DeleteMyLeave_ownTodayLeave_returns_422_LEAVE_NOT_MODIFIABLE()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        // Start date equals FakeToday 2026-06-15 — deleting a registration that starts today is not allowed
        await SeedRegistrationAsync(regId, EmployeeId, new DateOnly(2026, 6, 15), new DateOnly(2026, 6, 17));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.DeleteAsync($"/api/me/leave/{regId}");

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString().Should().Be("LEAVE_NOT_MODIFIABLE");
    }

    [Fact]
    public async Task DeleteMyLeave_anotherEmployeesRegistration_returns_404()
    {
        await Factory.ResetAsync();
        var regId = Guid.NewGuid();
        // Seed a registration for Nora, not Eddie
        await SeedRegistrationAsync(regId, NoraId, new DateOnly(2026, 6, 20), new DateOnly(2026, 6, 25));

        // Authenticate as Eddie (employee), not Nora
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.DeleteAsync($"/api/me/leave/{regId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
