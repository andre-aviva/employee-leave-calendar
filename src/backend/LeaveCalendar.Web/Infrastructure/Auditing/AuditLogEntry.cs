namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>
/// One append-only audit record for a single LeaveRegistration state change. Plain
/// persistence entity — no behaviour, no foreign keys (a record must outlive the row it
/// describes). <see cref="Changes"/> is a JSON document: changed columns (old→new) for
/// updates, the full column set for inserts/deletes.
/// </summary>
public sealed class AuditLogEntry
{
    public Guid Id { get; init; }
    public DateTimeOffset OccurredAt { get; init; }
    public AuditAction Action { get; init; }
    public Guid EntityId { get; init; }
    public Guid SubjectEmployeeId { get; init; }
    public Guid? ActorEmployeeId { get; init; }
    public required string ActorName { get; init; }
    public required string ActorRole { get; init; }
    public required string Changes { get; init; }
}
