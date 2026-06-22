namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>The kind of state transition captured in the audit trail.</summary>
public enum AuditAction
{
    Insert,
    Update,
    Delete
}
