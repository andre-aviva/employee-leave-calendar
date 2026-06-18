using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;
using Microsoft.IdentityModel.Tokens;

namespace LeaveCalendar.IntegrationTests.Features;

/// <summary>
/// Verifies that a JWT that is structurally valid (signed with the harness key,
/// correct issuer/audience) but is missing the required <c>sub</c> claim causes
/// a 401 response instead of a 500.
/// </summary>
public class MissingClaimTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    // Must match what ApiFactory injects
    private const string TestSigningKey = "test-signing-key-at-least-32-bytes-long!!";
    private const string TestIssuer     = "leave-calendar-tests";
    private const string TestAudience   = "leave-calendar-tests";

    private static string MintTokenWithoutSub()
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestSigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Deliberately omit "sub" — only include "role" so the token passes signature/
        // issuer/audience validation but triggers the missing-claim guard in CurrentUser.
        var token = new JwtSecurityToken(
            issuer: TestIssuer,
            audience: TestAudience,
            claims: [new System.Security.Claims.Claim("role", "Employee")],
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public async Task GetCurrentUser_tokenWithoutSubClaim_returns_401_not_500()
    {
        var rawToken = MintTokenWithoutSub();

        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", rawToken);

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            because: "a token missing the 'sub' claim should yield 401, not 500");
    }
}
