namespace LeaveCalendar.Web.Features.Calendar.ViewCalendar;

public sealed record Request
{
    public DateOnly From { get; init; }
    public DateOnly To { get; init; }
}
