using System.Text.Json;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Web.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>
/// Writes one <see cref="AuditLogEntry"/> per LeaveRegistration change into the SAME
/// <see cref="DbContext.SaveChanges"/> as the change itself, so a write is never persisted
/// unaudited (D7). Stateless: resolves <see cref="IClock"/> and <see cref="IAuditActorProvider"/>
/// from the application service provider at call time, which keeps it compatible with Aspire's
/// pooled DbContext (pooling forbids injecting services into the context constructor). Only
/// <see cref="LeaveRegistration"/> is inspected, so the audit rows it adds are never re-audited.
/// </summary>
public sealed class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        if (eventData.Context is not null) AddAuditEntries(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null) AddAuditEntries(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void AddAuditEntries(DbContext context)
    {
        // Accessing Entries<T>() runs change detection, so Modified/Added/Deleted are accurate.
        var entries = context.ChangeTracker
            .Entries<LeaveRegistration>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();
        if (entries.Count == 0) return;

        var services = context.GetService<IDbContextOptions>()
            .FindExtension<CoreOptionsExtension>()?.ApplicationServiceProvider
            ?? throw new InvalidOperationException(
                "Audit interceptor could not resolve the application service provider.");
        var occurredAt = services.GetRequiredService<IClock>().Now.ToUniversalTime();
        var actor = services.GetRequiredService<IAuditActorProvider>().GetCurrent();

        foreach (var entry in entries)
        {
            var action = entry.State switch
            {
                EntityState.Added => AuditAction.Insert,
                EntityState.Modified => AuditAction.Update,
                _ => AuditAction.Delete
            };
            context.Add(new AuditLogEntry
            {
                Id = Guid.NewGuid(),
                OccurredAt = occurredAt,
                Action = action,
                EntityId = entry.Entity.Id,
                SubjectEmployeeId = entry.Entity.EmployeeId,
                ActorEmployeeId = actor.EmployeeId,
                ActorName = actor.Name,
                ActorRole = actor.Role,
                Changes = SerializeChanges(entry, action)
            });
        }
    }

    private static string SerializeChanges(EntityEntry<LeaveRegistration> entry, AuditAction action)
    {
        var changes = new Dictionary<string, object?>();
        foreach (var prop in entry.Properties)
        {
            var name = prop.Metadata.Name;
            switch (action)
            {
                case AuditAction.Insert:
                    changes[name] = prop.CurrentValue;
                    break;
                case AuditAction.Delete:
                    changes[name] = prop.OriginalValue;
                    break;
                case AuditAction.Update when prop.IsModified:
                    changes[name] = new { old = prop.OriginalValue, @new = prop.CurrentValue };
                    break;
            }
        }
        return JsonSerializer.Serialize(changes);
    }
}
