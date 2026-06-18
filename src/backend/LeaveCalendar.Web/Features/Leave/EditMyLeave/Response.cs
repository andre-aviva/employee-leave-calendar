namespace LeaveCalendar.Web.Features.Leave.EditMyLeave;
public sealed record Response(Guid Id, Guid LeaveTypeId, string StartDate, string EndDate, string? Description, string? Notes);
