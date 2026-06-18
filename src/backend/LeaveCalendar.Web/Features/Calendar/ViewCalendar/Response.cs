namespace LeaveCalendar.Web.Features.Calendar.ViewCalendar;

public sealed record CalendarEntryDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    Guid LeaveTypeId,
    string LeaveTypeName,
    string ColourHex,
    string StartDate,
    string EndDate);
