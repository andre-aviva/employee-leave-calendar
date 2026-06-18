namespace LeaveCalendar.Web.Features.Admin.AdminCreateLeave;

public sealed record Response(
    Guid Id,
    Guid EmployeeId,
    Guid LeaveTypeId,
    string StartDate,
    string EndDate,
    string? Description,
    string? Notes);
