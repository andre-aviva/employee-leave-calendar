namespace LeaveCalendar.Web.Features.Leave.ListMyLeave;
public sealed record MyLeaveDto(
    Guid Id,
    Guid LeaveTypeId,
    string LeaveTypeName,
    string ColourHex,
    string StartDate,
    string EndDate,
    string? Description,
    string? Notes);
