using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace LeaveCalendar.IntegrationTests.Infrastructure;

public static class AuthExtensions
{
    private record SignInRequest(string Username, string Password);
    private record SignInResponse(string Token, string Name, string Role);

    public static async Task<HttpClient> AuthenticatedClientAsync(
        this ApiFactory factory,
        string username,
        string password)
    {
        var anonClient = factory.CreateClient();
        var response = await anonClient.PostAsJsonAsync("/api/auth/sign-in", new SignInRequest(username, password));
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<SignInResponse>()
            ?? throw new InvalidOperationException("Sign-in response body was null.");

        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body.Token);

        return client;
    }
}
