using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;

namespace LeaveCalendar.IntegrationTests.Features;

public class SignInTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private record SignInRequest(string Username, string Password);
    private record SignInResponse(string Token, string Name, string Role);

    [Fact]
    public async Task SignIn_with_valid_admin_credentials_returns_200_with_token_and_role()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/sign-in", new SignInRequest("admin", "Admin!123"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<SignInResponse>();
        body.Should().NotBeNull();
        body!.Token.Should().NotBeNullOrEmpty();
        body.Name.Should().Be("Alice Admin");
        body.Role.Should().Be("Admin");
    }

    [Fact]
    public async Task SignIn_with_wrong_password_returns_401()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/sign-in", new SignInRequest("admin", "WrongPassword!"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SignIn_with_unknown_username_returns_401()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/sign-in", new SignInRequest("nonexistent", "Admin!123"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SignIn_with_missing_password_returns_400()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/sign-in", new SignInRequest("admin", ""));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SignIn_with_missing_username_returns_400()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/sign-in", new SignInRequest("", "Admin!123"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
