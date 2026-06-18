using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.IntegrationTests.Features;

public class ListAllLeaveTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    // Seeded GUIDs
    private static readonly Guid AdminId         = Guid.Parse("22222222-0000-0000-0000-000000000001"); // Alice Admin
    private static readonly Guid EmployeeId      = Guid.Parse("22222222-0000-0000-0000-000000000002"); // Eddie Employee
    private static readonly Guid NoraId          = Guid.Parse("22222222-0000-0000-0000-000000000003"); // Nora Newbie
    private static readonly Guid VacationTypeId  = Guid.Parse("11111111-0000-0000-0000-000000000001");
    private static readonly Guid SickLeaveTypeId = Guid.Parse("11111111-0000-0000-0000-000000000002");
    private static readonly Guid PublicHolidayId = Guid.Parse("11111111-0000-0000-0000-000000000003");
    private static readonly Guid OtherTypeId     = Guid.Parse("11111111-0000-0000-0000-000000000004");

    private record AdminLeaveDto(Guid Id, Guid EmployeeId, string EmployeeName, Guid LeaveTypeId, string LeaveTypeName,
        string ColourHex, string StartDate, string EndDate, string? Description, string? Notes);

    private record PagedResult(
        JsonElement Items,
        int Page,
        int PageSize,
        int TotalCount,
        int TotalPages);

    private async Task SeedAsync(params LeaveRegistration[] regs)
    {
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        ctx.LeaveRegistrations.AddRange(regs);
        await ctx.SaveChangesAsync();
    }

    private LeaveRegistration MakeReg(Guid id, Guid employeeId, Guid typeId, DateOnly start, DateOnly end) =>
        new() { Id = id, EmployeeId = employeeId, LeaveTypeId = typeId, StartDate = start, EndDate = end };

    [Fact]
    public async Task ListAllLeave_anonymous_returns_401()
    {
        var response = await Client.GetAsync("/api/admin/leave");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ListAllLeave_employeeRole_returns_403()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var response = await client.GetAsync("/api/admin/leave");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ListAllLeave_noFilter_returns_all_sorted_start_descending_with_correct_envelope()
    {
        await Factory.ResetAsync();
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var id3 = Guid.NewGuid();
        await SeedAsync(
            MakeReg(id1, EmployeeId, VacationTypeId,  new DateOnly(2026, 7, 1),  new DateOnly(2026, 7, 5)),
            MakeReg(id2, NoraId,     SickLeaveTypeId,  new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 12)),
            MakeReg(id3, EmployeeId, OtherTypeId,      new DateOnly(2026, 6, 1),  new DateOnly(2026, 6, 3)));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.GetAsync("/api/admin/leave?page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("totalCount").GetInt32().Should().Be(3);
        body.GetProperty("page").GetInt32().Should().Be(1);
        body.GetProperty("pageSize").GetInt32().Should().Be(20);
        body.GetProperty("totalPages").GetInt32().Should().Be(1);

        var items = body.GetProperty("items").EnumerateArray().ToList();
        items.Should().HaveCount(3);
        // sorted start date descending: id2 (Jul 10), id1 (Jul 1), id3 (Jun 1)
        items[0].GetProperty("id").GetGuid().Should().Be(id2);
        items[1].GetProperty("id").GetGuid().Should().Be(id1);
        items[2].GetProperty("id").GetGuid().Should().Be(id3);

        // verify fields on first item
        items[0].GetProperty("employeeId").GetGuid().Should().Be(NoraId);
        items[0].GetProperty("employeeName").GetString().Should().Be("Nora Newbie");
        items[0].GetProperty("leaveTypeId").GetGuid().Should().Be(SickLeaveTypeId);
        items[0].GetProperty("leaveTypeName").GetString().Should().Be("Sick Leave");
        items[0].GetProperty("colourHex").GetString().Should().Be("#C62828");
        items[0].GetProperty("startDate").GetString().Should().Be("2026-07-10");
        items[0].GetProperty("endDate").GetString().Should().Be("2026-07-12");
    }

    [Fact]
    public async Task ListAllLeave_filterByEmployeeId_returns_only_that_employee()
    {
        await Factory.ResetAsync();
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        await SeedAsync(
            MakeReg(id1, EmployeeId, VacationTypeId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5)),
            MakeReg(id2, NoraId,     VacationTypeId, new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 12)));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.GetAsync($"/api/admin/leave?employeeId={EmployeeId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("totalCount").GetInt32().Should().Be(1);
        var items = body.GetProperty("items").EnumerateArray().ToList();
        items.Should().HaveCount(1);
        items[0].GetProperty("employeeId").GetGuid().Should().Be(EmployeeId);
    }

    [Fact]
    public async Task ListAllLeave_filterByMultipleLeaveTypeIds_returns_union()
    {
        await Factory.ResetAsync();
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var id3 = Guid.NewGuid();
        await SeedAsync(
            MakeReg(id1, EmployeeId, VacationTypeId,  new DateOnly(2026, 7, 1),  new DateOnly(2026, 7, 5)),
            MakeReg(id2, NoraId,     SickLeaveTypeId,  new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 12)),
            MakeReg(id3, EmployeeId, OtherTypeId,      new DateOnly(2026, 7, 20), new DateOnly(2026, 7, 22)));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        // Filter for Vacation + SickLeave (not Other)
        var response = await client.GetAsync($"/api/admin/leave?leaveTypeId={VacationTypeId}&leaveTypeId={SickLeaveTypeId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("totalCount").GetInt32().Should().Be(2);
        var items = body.GetProperty("items").EnumerateArray().ToList();
        items.Should().HaveCount(2);
        items.Select(i => i.GetProperty("id").GetGuid()).Should().BeEquivalentTo(new[] { id2, id1 }); // desc
    }

    [Fact]
    public async Task ListAllLeave_filterByFromTo_narrows_results()
    {
        await Factory.ResetAsync();
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var id3 = Guid.NewGuid();
        await SeedAsync(
            MakeReg(id1, EmployeeId, VacationTypeId, new DateOnly(2026, 6, 1),  new DateOnly(2026, 6, 5)),
            MakeReg(id2, EmployeeId, VacationTypeId, new DateOnly(2026, 7, 1),  new DateOnly(2026, 7, 5)),
            MakeReg(id3, EmployeeId, VacationTypeId, new DateOnly(2026, 8, 1),  new DateOnly(2026, 8, 5)));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.GetAsync("/api/admin/leave?from=2026-06-15&to=2026-07-31");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("totalCount").GetInt32().Should().Be(1);
        var items = body.GetProperty("items").EnumerateArray().ToList();
        items.Should().HaveCount(1);
        items[0].GetProperty("id").GetGuid().Should().Be(id2);
    }

    [Fact]
    public async Task ListAllLeave_pagination_pageSize1_returns_one_item_with_correct_envelope()
    {
        await Factory.ResetAsync();
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var id3 = Guid.NewGuid();
        await SeedAsync(
            MakeReg(id1, EmployeeId, VacationTypeId, new DateOnly(2026, 7, 1),  new DateOnly(2026, 7, 5)),
            MakeReg(id2, NoraId,     SickLeaveTypeId, new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 12)),
            MakeReg(id3, EmployeeId, OtherTypeId,     new DateOnly(2026, 7, 20), new DateOnly(2026, 7, 22)));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.GetAsync("/api/admin/leave?page=1&pageSize=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("page").GetInt32().Should().Be(1);
        body.GetProperty("pageSize").GetInt32().Should().Be(1);
        body.GetProperty("totalCount").GetInt32().Should().Be(3);
        body.GetProperty("totalPages").GetInt32().Should().Be(3);

        var items = body.GetProperty("items").EnumerateArray().ToList();
        items.Should().HaveCount(1);
        // page 1 with desc sort should return the latest (id3 Jul 20)
        items[0].GetProperty("id").GetGuid().Should().Be(id3);
    }

    [Fact]
    public async Task ListAllLeave_pageOutOfRange_clampsToLastPage()
    {
        await Factory.ResetAsync();
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var id3 = Guid.NewGuid();
        // 3 records, pageSize=2 → totalPages=2; last page (page 2) has 1 item
        await SeedAsync(
            MakeReg(id1, EmployeeId, VacationTypeId,  new DateOnly(2026, 7, 1),  new DateOnly(2026, 7, 5)),
            MakeReg(id2, NoraId,     SickLeaveTypeId,  new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 12)),
            MakeReg(id3, EmployeeId, OtherTypeId,      new DateOnly(2026, 7, 20), new DateOnly(2026, 7, 22)));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        // Request page=9, which is beyond totalPages=2
        var response = await client.GetAsync("/api/admin/leave?page=9&pageSize=2");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("totalPages").GetInt32().Should().Be(2);
        body.GetProperty("totalCount").GetInt32().Should().Be(3);
        // Clamped page should be 2 (the last page), not 9
        body.GetProperty("page").GetInt32().Should().Be(2);
        body.GetProperty("pageSize").GetInt32().Should().Be(2);

        var items = body.GetProperty("items").EnumerateArray().ToList();
        // desc sort: id3(Jul 20), id2(Jul 10), id1(Jul 1) → page 2 with size 2 = id1(Jul 1)
        items.Should().HaveCount(1);
        items[0].GetProperty("id").GetGuid().Should().Be(id1);
    }
}
