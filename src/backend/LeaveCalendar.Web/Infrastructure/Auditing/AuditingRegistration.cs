using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>
/// Wires the audit subsystem. <see cref="AddAuditing"/> registers the actor provider in DI;
/// <see cref="UseAuditing"/> attaches the interceptor to a DbContext's options. Both the
/// production registration and the integration-test harness call <see cref="UseAuditing"/> so
/// the trail is captured identically in each.
/// </summary>
public static class AuditingRegistration
{
    public static IServiceCollection AddAuditing(this IServiceCollection services)
    {
        // Singleton so it can be resolved from the (root) application service provider inside
        // the interceptor; it reads the per-request principal via IHttpContextAccessor.
        services.AddSingleton<IAuditActorProvider, AuditActorProvider>();
        return services;
    }

    public static DbContextOptionsBuilder UseAuditing(this DbContextOptionsBuilder options)
    {
        options.AddInterceptors(new AuditSaveChangesInterceptor());
        return options;
    }
}
