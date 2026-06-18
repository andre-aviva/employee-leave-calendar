namespace LeaveCalendar.Web.Features.Admin.AdminEditLeave;

public sealed record Request(
    Guid LeaveTypeId,
    DateOnly StartDate,
    DateOnly EndDate,
    string? Description,
    string? Notes);
