namespace LeaveCalendar.Web.Features.Admin.AdminCreateLeave;

public sealed record Request(
    Guid EmployeeId,
    Guid LeaveTypeId,
    DateOnly StartDate,
    DateOnly EndDate,
    string? Description,
    string? Notes);
