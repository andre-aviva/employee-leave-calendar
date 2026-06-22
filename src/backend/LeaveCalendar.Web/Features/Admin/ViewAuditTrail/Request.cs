using LeaveCalendar.Web.Infrastructure.Auditing;

namespace LeaveCalendar.Web.Features.Admin.ViewAuditTrail;

public sealed record Request
{
    public Guid? SubjectEmployeeId { get; init; }
    public AuditAction? Action { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    public int? Page { get; init; }
    public int? PageSize { get; init; }
}
