using System.Security.Claims;
using LeaveCalendar.Domain.Employees;
using Microsoft.IdentityModel.JsonWebTokens;

namespace LeaveCalendar.Web.Infrastructure.Identity;

public sealed class CurrentUser : ICurrentUser
{
    private readonly ClaimsPrincipal _user;

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _user = httpContextAccessor.HttpContext?.User
            ?? throw new InvalidOperationException("No HTTP context available.");
    }

    public Guid EmployeeId =>
        Guid.Parse(_user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new InvalidOperationException("'sub' claim is missing."));

    public Role Role =>
        Enum.Parse<Role>(_user.FindFirstValue("role")
            ?? throw new InvalidOperationException("'role' claim is missing."));

    public bool IsAdmin => Role == Role.Admin;

    public string Name =>
        _user.FindFirstValue(JwtRegisteredClaimNames.Name) ?? string.Empty;
}
