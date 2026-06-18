using LeaveCalendar.Web.Infrastructure.Time;
namespace LeaveCalendar.IntegrationTests.Infrastructure;

/// <summary>Fixed-date clock used in integration tests so date-rule assertions are deterministic.</summary>
public sealed class FakeClock(DateOnly today) : IClock
{
    public DateOnly Today { get; } = today;
    public DateTimeOffset Now { get; } = new(today.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(2));
}
