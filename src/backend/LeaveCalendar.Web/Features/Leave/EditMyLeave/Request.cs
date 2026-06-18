namespace LeaveCalendar.Web.Features.Leave.EditMyLeave;
public sealed record Request(Guid LeaveTypeId, DateOnly StartDate, DateOnly EndDate, string? Description, string? Notes);
