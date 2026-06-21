namespace LeaveCalendar.Web.Infrastructure.Jwt;

public sealed class JwtOptions
{
    public string Issuer { get; init; } = string.Empty;
    public string Audience { get; init; } = string.Empty;
    public string SigningKey { get; init; } = string.Empty;

    // Short-lived access tokens (default 60 min). Combined with the per-request DB
    // re-validation in DependencyInjection (OnTokenValidated), a deleted or role-changed
    // account loses access almost immediately rather than lingering for hours.
    public int ExpiryMinutes { get; init; } = 60;
}
