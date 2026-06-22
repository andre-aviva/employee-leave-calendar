namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>The single seam for resolving "who" — the current request's actor, or System.</summary>
public interface IAuditActorProvider
{
    AuditActor GetCurrent();
}
