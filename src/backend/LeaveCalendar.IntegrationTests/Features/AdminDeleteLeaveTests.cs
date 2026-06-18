using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.IntegrationTests.Features;

public class AdminDeleteLeaveTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private static readonly Guid EmployeeId     = Guid.Parse("22222222-0000-0000-0000-000000000002"); // Eddie Employee
    private static readonly Guid NoraId         = Guid.Parse("22222222-0000-0000-0000-000000000003");
    private static readonly Guid VacationTypeId = Guid.Parse("11111111-0000-0000-0000-000000000001");

    private async Task<Guid> SeedRegistrationAsync(Guid employeeId, DateOnly start, DateOnly end)
    {
        var id = Guid.NewGuid();
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
        return id;
    }

    [Fact]
    public async Task AdminDeleteLeave_employeeRole_returns_403()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var response = await client.DeleteAsync($"/api/admin/leave/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AdminDeleteLeave_unknownId_returns_404()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.DeleteAsync($"/api/admin/leave/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AdminDeleteLeave_futureDated_returns_204_and_gone()
    {
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EmployeeId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.DeleteAsync($"/api/admin/leave/{regId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        var gone = await ctx.LeaveRegistrations.FindAsync(regId);
        gone.Should().BeNull();
    }

    [Fact]
    public async Task AdminDeleteLeave_pastDated_returns_204()
    {
        // Admin is UNRESTRICTED — may delete past-dated leave
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EmployeeId, new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 5));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.DeleteAsync($"/api/admin/leave/{regId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        var gone = await ctx.LeaveRegistrations.FindAsync(regId);
        gone.Should().BeNull();
    }

    [Fact]
    public async Task AdminDeleteLeave_anyEmployeesLeave_returns_204()
    {
        // Admin can delete any employee's leave (incl. Nora's)
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(NoraId, new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 12));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.DeleteAsync($"/api/admin/leave/{regId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
