using System.Security.Claims;
using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Web.Common;
using Microsoft.IdentityModel.JsonWebTokens;

namespace LeaveCalendar.Web.Infrastructure.Identity;

public sealed class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    private ClaimsPrincipal User =>
        httpContextAccessor.HttpContext?.User
            ?? throw new UnauthorizedException("No HTTP context available.");

    public Guid EmployeeId
    {
        get
        {
            var raw = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? throw new UnauthorizedException("'sub' claim is missing from the token.");
            if (!Guid.TryParse(raw, out var id))
                throw new UnauthorizedException($"'sub' claim '{raw}' is not a valid GUID.");
            return id;
        }
    }

    public Role Role
    {
        get
        {
            var raw = User.FindFirstValue("role")
                ?? throw new UnauthorizedException("'role' claim is missing from the token.");
            if (!Enum.TryParse<Role>(raw, out var role))
                throw new UnauthorizedException($"'role' claim '{raw}' is not a recognised role.");
            return role;
        }
    }

    public bool IsAdmin => Role == Role.Admin;

    public string Name =>
        User.FindFirstValue(JwtRegisteredClaimNames.Name) ?? string.Empty;
}
