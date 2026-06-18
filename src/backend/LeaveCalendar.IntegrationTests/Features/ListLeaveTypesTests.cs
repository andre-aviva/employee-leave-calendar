using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;

namespace LeaveCalendar.IntegrationTests.Features;

public class ListLeaveTypesTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private record LeaveTypeDto(Guid Id, string Name, string ColourHex, string RegisterableBy);

    private static void AssertSeededLeaveTypes(IReadOnlyList<LeaveTypeDto> body)
    {
        body.Should().HaveCount(4);
        body.Select(x => x.Name).Should().BeInAscendingOrder();
        body.Should().Contain(x => x.Name == "Vacation" && x.ColourHex == "#2E7D32" && x.RegisterableBy == "Employee");
        body.Should().Contain(x => x.Name == "Sick Leave" && x.ColourHex == "#C62828" && x.RegisterableBy == "Employee");
        body.Should().Contain(x => x.Name == "Public Holiday" && x.ColourHex == "#1565C0" && x.RegisterableBy == "Admin");
        body.Should().Contain(x => x.Name == "Other" && x.ColourHex == "#6A1B9A" && x.RegisterableBy == "Employee");
    }

    [Fact]
    public async Task ListLeaveTypes_anonymous_returns_401()
    {
        var response = await Client.GetAsync("/api/leave-types");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ListLeaveTypes_authenticated_employee_returns_200_with_4_seeded_types()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.GetAsync("/api/leave-types");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<LeaveTypeDto>>();
        body.Should().NotBeNull();
        AssertSeededLeaveTypes(body!);
    }

    [Fact]
    public async Task ListLeaveTypes_authenticated_admin_returns_200()
    {
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.GetAsync("/api/leave-types");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<LeaveTypeDto>>();
        body.Should().NotBeNull();
        AssertSeededLeaveTypes(body!);
    }
}
