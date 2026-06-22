using System.Security.Claims;
using LeaveCalendar.Web.Infrastructure.Jwt;
using Microsoft.AspNetCore.Http;

namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>
/// Reads the actor straight off the request principal's JWT claims. Deliberately does NOT use
/// the scoped, throwing <c>ICurrentUser</c>: this is resolved from a singleton interceptor and
/// must never throw, falling back to <see cref="AuditActor.System"/> whenever there is no
/// authenticated context (startup paths, or rows seeded directly via the DbContext in tests).
/// </summary>
public sealed class AuditActorProvider(IHttpContextAccessor httpContextAccessor) : IAuditActorProvider
{
    public AuditActor GetCurrent()
    {
        var user = httpContextAccessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
            return AuditActor.System;

        if (!Guid.TryParse(user.FindFirstValue(JwtClaimNames.Subject), out var employeeId))
            return AuditActor.System;

        var name = user.FindFirstValue(JwtClaimNames.Name);
        var role = user.FindFirstValue(JwtClaimNames.Role);
        // A token with a valid 'sub' but missing name/role is partial/untrusted — attribute to
        // System rather than recording a real employee GUID with a blank name/role.
        if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(role))
            return AuditActor.System;
        return new AuditActor(employeeId, name, role);
    }
}
