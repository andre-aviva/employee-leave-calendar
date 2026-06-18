namespace LeaveCalendar.Web.Infrastructure.Time;
public sealed class SystemClock : IClock
{
    private static readonly TimeZoneInfo Amsterdam = TimeZoneInfo.FindSystemTimeZoneById("Europe/Amsterdam");
    public DateTimeOffset Now => TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, Amsterdam);
    public DateOnly Today => DateOnly.FromDateTime(Now.DateTime);
}
