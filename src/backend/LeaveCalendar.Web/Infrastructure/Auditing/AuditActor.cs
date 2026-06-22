namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>Who performed an audited change. <see cref="System"/> marks a non-request write.</summary>
public sealed record AuditActor(Guid? EmployeeId, string Name, string Role)
{
    public static readonly AuditActor System = new(null, "System", "System");
}
