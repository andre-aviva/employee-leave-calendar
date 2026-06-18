using LeaveCalendar.Web.Infrastructure.Time;
namespace LeaveCalendar.UnitTests.Fakes;
public sealed class FakeClock(DateOnly today) : IClock
{
    public DateOnly Today { get; } = today;
    public DateTimeOffset Now { get; } = new(today.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
}
