using Microsoft.IdentityModel.JsonWebTokens;

namespace LeaveCalendar.Web.Infrastructure.Jwt;

/// <summary>
/// The single source of truth for the JWT claim names this app issues and reads, so the
/// token issuer (<see cref="JwtTokenIssuer"/>) and the readers (CurrentUser and the bearer
/// validation in DependencyInjection) can never drift apart.
///
/// Identity and display are a deliberate split — do not collapse them:
/// <list type="bullet">
///   <item><see cref="Subject"/> ("sub") — the stable employee identity (a GUID).
///   Authorization and the per-request DB re-validation read this; it is never a display value.</item>
///   <item><see cref="Name"/> ("name") — the human-readable display name only. Bound to
///   <c>ClaimsIdentity.Name</c> via NameClaimType so the two agree (see DependencyInjection).</item>
///   <item><see cref="Username"/> ("unique_name") — the login username.</item>
///   <item><see cref="Role"/> ("role") — the app role; matched by RoleClaimType.</item>
/// </list>
/// </summary>
public static class JwtClaimNames
{
    public const string Subject = JwtRegisteredClaimNames.Sub;
    public const string Name = JwtRegisteredClaimNames.Name;
    public const string Username = JwtRegisteredClaimNames.UniqueName;

    // Not an IANA-registered claim — our own role claim, matched by RoleClaimType.
    public const string Role = "role";
}
