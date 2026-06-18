using System.Security.Claims;
using LeaveCalendar.Domain.Employees;
using Microsoft.IdentityModel.JsonWebTokens;

namespace LeaveCalendar.Web.Infrastructure.Identity;

public sealed class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    private ClaimsPrincipal User =>
        httpContextAccessor.HttpContext?.User
            ?? throw new InvalidOperationException("No HTTP context available.");

    public Guid EmployeeId =>
        Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new InvalidOperationException("'sub' claim is missing."));

    public Role Role =>
        Enum.Parse<Role>(User.FindFirstValue("role")
            ?? throw new InvalidOperationException("'role' claim is missing."));

    public bool IsAdmin => Role == Role.Admin;

    public string Name =>
        User.FindFirstValue(JwtRegisteredClaimNames.Name) ?? string.Empty;
}
