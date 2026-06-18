using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;

namespace LeaveCalendar.IntegrationTests.Features;

public class ListEmployeesTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private record EmployeeDto(Guid Id, string Name, string Role);

    [Fact]
    public async Task ListEmployees_anonymous_returns_401()
    {
        var response = await Client.GetAsync("/api/employees");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ListEmployees_employee_role_returns_403()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.GetAsync("/api/employees");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ListEmployees_admin_returns_200_with_seeded_employees()
    {
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.GetAsync("/api/employees");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<EmployeeDto>>();
        body.Should().NotBeNull();
        body!.Should().HaveCount(3);
        body.Select(x => x.Name).Should().BeInAscendingOrder();
        body.Should().Contain(x => x.Name == "Alice Admin" && x.Role == "Admin");
        body.Should().Contain(x => x.Name == "Eddie Employee" && x.Role == "Employee");
        body.Should().Contain(x => x.Name == "Nora Newbie" && x.Role == "Employee");
    }

    [Fact]
    public async Task ListEmployees_admin_response_does_not_contain_password_hash_or_username()
    {
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.GetAsync("/api/employees");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var raw = await response.Content.ReadAsStringAsync();
        raw.Should().NotContainAny("passwordHash", "PasswordHash", "username", "Username");
    }
}
