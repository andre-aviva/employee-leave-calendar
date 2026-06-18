using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;

namespace LeaveCalendar.IntegrationTests.Features;

public class GetCurrentUserTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private record GetCurrentUserResponse(Guid Id, string Name, string Role);

    [Fact]
    public async Task GetCurrentUser_without_token_returns_401()
    {
        var response = await Client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetCurrentUser_authenticated_as_employee_returns_200_with_user_info()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<GetCurrentUserResponse>();
        body.Should().NotBeNull();
        body!.Id.Should().NotBeEmpty();
        body.Name.Should().Be("Eddie Employee");
        body.Role.Should().Be("Employee");
    }

    [Fact]
    public async Task GetCurrentUser_authenticated_as_admin_returns_200_with_Admin_role()
    {
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<GetCurrentUserResponse>();
        body.Should().NotBeNull();
        body!.Name.Should().Be("Alice Admin");
        body.Role.Should().Be("Admin");
        body.Id.Should().NotBeEmpty();
    }
}
