using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;
using Microsoft.IdentityModel.Tokens;

namespace LeaveCalendar.IntegrationTests.Features;

/// <summary>
/// Issue #24: short-lived tokens, zero clock skew, and per-request DB re-validation so a
/// deleted or role-changed account loses access immediately instead of lingering until expiry.
/// </summary>
public class AuthHardeningTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    // Seeded "Eddie Employee" — exists in the DB with role Employee.
    private static readonly Guid EmployeeId = Guid.Parse("22222222-0000-0000-0000-000000000002");

    private static string MintToken(Guid sub, string role, DateTime expires)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(ApiFactory.TestJwtSigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: ApiFactory.TestJwtIssuer,
            audience: ApiFactory.TestJwtAudience,
            claims: [new Claim("sub", sub.ToString()), new Claim("role", role)],
            expires: expires,
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private HttpClient ClientWithToken(string token)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task Token_for_unknown_or_deleted_account_returns_401()
    {
        // Structurally valid token whose subject has no Employee row (e.g. deleted account).
        var token = MintToken(Guid.NewGuid(), "Employee", DateTime.UtcNow.AddMinutes(30));

        var response = await ClientWithToken(token).GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Token_whose_role_no_longer_matches_the_database_returns_401()
    {
        // Eddie is an Employee in the DB; an admin-claiming token (issued before a demotion)
        // must be rejected once the DB role no longer matches.
        var token = MintToken(EmployeeId, "Admin", DateTime.UtcNow.AddMinutes(30));

        var response = await ClientWithToken(token).GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Expired_token_is_rejected_with_zero_clock_skew()
    {
        // 2 minutes past expiry — the framework's default 5-minute skew would have allowed
        // this; with ClockSkew = Zero it must be rejected.
        var token = MintToken(EmployeeId, "Employee", DateTime.UtcNow.AddMinutes(-2));

        var response = await ClientWithToken(token).GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Valid_token_matching_the_database_still_succeeds()
    {
        // Positive control: existing account, matching role, valid lifetime → 200.
        var token = MintToken(EmployeeId, "Employee", DateTime.UtcNow.AddMinutes(30));

        var response = await ClientWithToken(token).GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
