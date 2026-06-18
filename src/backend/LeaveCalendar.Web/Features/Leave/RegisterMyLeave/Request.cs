namespace LeaveCalendar.Web.Features.Leave.RegisterMyLeave;
public sealed record Request(Guid LeaveTypeId, DateOnly StartDate, DateOnly EndDate, string? Description, string? Notes);
