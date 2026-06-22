namespace LeaveCalendar.Web.Infrastructure.Time;
public sealed class SystemClock : IClock
{
    private static readonly TimeZoneInfo Amsterdam = TimeZoneInfo.FindSystemTimeZoneById("Europe/Amsterdam");
    // Now is a true UTC instant (offset zero) — required by Npgsql for the timestamptz audit
    // column, and the correct basis for forensic ordering/filters. Today stays the Amsterdam
    // business-day used by the leave rules, computed independently of Now's offset.
    public DateTimeOffset Now => DateTimeOffset.UtcNow;
    public DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, Amsterdam).DateTime);
}
