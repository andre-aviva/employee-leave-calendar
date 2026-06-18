using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.IntegrationTests.Features;

public class RegisterMyLeaveTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private record RegisterRequest(Guid LeaveTypeId, string StartDate, string EndDate, string? Description = null, string? Notes = null);
    private record RegisterResponse(Guid Id, Guid LeaveTypeId, string StartDate, string EndDate, string? Description, string? Notes);

    // Seeded GUIDs from DbSeeder
    private static readonly Guid EmployeeId       = Guid.Parse("22222222-0000-0000-0000-000000000002"); // Eddie Employee
    private static readonly Guid VacationTypeId   = Guid.Parse("11111111-0000-0000-0000-000000000001");
    private static readonly Guid PublicHolidayId  = Guid.Parse("11111111-0000-0000-0000-000000000003");

    // Dates relative to FakeToday = 2026-06-15
    private static readonly string FutureStart = "2026-06-20";
    private static readonly string FutureEnd   = "2026-06-25";
    private static readonly string PastStart   = "2026-06-10";
    private static readonly string PastEnd     = "2026-06-12";

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
    public async Task RegisterMyLeave_anonymous_returns_401()
    {
        var response = await Client.PostAsJsonAsync("/api/me/leave", new RegisterRequest(VacationTypeId, FutureStart, FutureEnd));
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RegisterMyLeave_happyPath_returns_201_and_persists()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PostAsJsonAsync("/api/me/leave",
            new RegisterRequest(VacationTypeId, FutureStart, FutureEnd, "Summer break", null));

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<RegisterResponse>();
        body.Should().NotBeNull();
        body!.LeaveTypeId.Should().Be(VacationTypeId);
        body.StartDate.Should().Be(FutureStart);
        body.EndDate.Should().Be(FutureEnd);
        body.Description.Should().Be("Summer break");
        body.Id.Should().NotBeEmpty();

        // Verify persisted
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        var persisted = await ctx.LeaveRegistrations.FindAsync(body.Id);
        persisted.Should().NotBeNull();
        persisted!.EmployeeId.Should().Be(EmployeeId);
        persisted.LeaveTypeId.Should().Be(VacationTypeId);
        persisted.StartDate.Should().Be(new DateOnly(2026, 6, 20));
        persisted.EndDate.Should().Be(new DateOnly(2026, 6, 25));
        persisted.Description.Should().Be("Summer break");
    }

    [Fact]
    public async Task RegisterMyLeave_overlappingExistingLeave_returns_422_OVERLAP()
    {
        await Factory.ResetAsync();
        // Seed an existing registration that overlaps 2026-06-20..2026-06-25
        await SeedRegistrationAsync(Guid.NewGuid(), EmployeeId,
            new DateOnly(2026, 6, 22), new DateOnly(2026, 6, 28));

        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PostAsJsonAsync("/api/me/leave",
            new RegisterRequest(VacationTypeId, FutureStart, FutureEnd));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString()
            .Should().Be("OVERLAP");
    }

    [Fact]
    public async Task RegisterMyLeave_pastStartDate_returns_422_START_DATE_IN_PAST()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PostAsJsonAsync("/api/me/leave",
            new RegisterRequest(VacationTypeId, PastStart, PastEnd));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString()
            .Should().Be("START_DATE_IN_PAST");
    }

    [Fact]
    public async Task RegisterMyLeave_employeeRegisteringPublicHoliday_returns_422_TYPE_NOT_REGISTERABLE()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PostAsJsonAsync("/api/me/leave",
            new RegisterRequest(PublicHolidayId, FutureStart, FutureEnd));

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("code").GetString()
            .Should().Be("TYPE_NOT_REGISTERABLE");
    }

    [Fact]
    public async Task RegisterMyLeave_endDateBeforeStartDate_returns_400()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PostAsJsonAsync("/api/me/leave",
            new RegisterRequest(VacationTypeId, FutureEnd, FutureStart)); // deliberately swapped

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RegisterMyLeave_descriptionTooLong_returns_400()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var tooLong = new string('x', 51);

        var response = await client.PostAsJsonAsync("/api/me/leave",
            new RegisterRequest(VacationTypeId, FutureStart, FutureEnd, tooLong));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RegisterMyLeave_unknownLeaveTypeId_returns_404()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var unknownId = Guid.NewGuid();

        var response = await client.PostAsJsonAsync("/api/me/leave",
            new RegisterRequest(unknownId, FutureStart, FutureEnd));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
