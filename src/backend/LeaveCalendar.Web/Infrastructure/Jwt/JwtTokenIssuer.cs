using System.Text;
using LeaveCalendar.Domain.Employees;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace LeaveCalendar.Web.Infrastructure.Jwt;

public sealed class JwtTokenIssuer : IJwtTokenIssuer
{
    private readonly JwtOptions _options;
    private readonly SigningCredentials _credentials;
    private readonly JsonWebTokenHandler _handler = new();

    public JwtTokenIssuer(IOptions<JwtOptions> options)
    {
        _options = options.Value;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        _credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    }

    public string Issue(Employee employee)
    {
        // Issue with the same Microsoft.IdentityModel stack the bearer middleware validates
        // with (JsonWebTokenHandler) — one token stack end to end. Claim names come from
        // JwtClaimNames so the issuer and the readers cannot drift.
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            Expires = DateTime.UtcNow.AddMinutes(_options.ExpiryMinutes),
            SigningCredentials = _credentials,
            Claims = new Dictionary<string, object>
            {
                [JwtClaimNames.Subject] = employee.Id.ToString(),
                [JwtClaimNames.Name] = employee.Name,
                [JwtClaimNames.Role] = employee.Role.ToString(),
                [JwtClaimNames.Username] = employee.Username,
            }
        };

        return _handler.CreateToken(descriptor);
    }
}
