namespace LeaveCalendar.Web.Features.Admin.ListAllLeave;

public sealed record Request
{
    public Guid? EmployeeId { get; init; }
    public Guid[]? LeaveTypeId { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    public int? Page { get; init; }
    public int? PageSize { get; init; }
}
