namespace LeaveCalendar.Web.Features.Admin.ListAllLeave;

public sealed record AdminLeaveDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    Guid LeaveTypeId,
    string LeaveTypeName,
    string ColourHex,
    string StartDate,
    string EndDate,
    string? Description,
    string? Notes);
