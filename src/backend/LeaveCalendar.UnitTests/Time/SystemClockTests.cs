using FluentAssertions;
using LeaveCalendar.Web.Infrastructure.Time;
using Xunit;
namespace LeaveCalendar.UnitTests.Time;
public class SystemClockTests
{
    [Fact]
    public void Now_is_utc()
    {
        new SystemClock().Now.Offset.Should().Be(TimeSpan.Zero);
    }

    [Fact]
    public void Today_is_the_Amsterdam_calendar_date()
    {
        var amsterdam = TimeZoneInfo.FindSystemTimeZoneById("Europe/Amsterdam");
        var expected = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, amsterdam).DateTime);
        new SystemClock().Today.Should().Be(expected);
    }
}
