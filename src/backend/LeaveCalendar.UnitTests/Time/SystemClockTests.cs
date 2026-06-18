using FluentAssertions;
using LeaveCalendar.Web.Infrastructure.Time;
using Xunit;
namespace LeaveCalendar.UnitTests.Time;
public class SystemClockTests
{
    [Fact]
    public void Today_matches_Now_date_in_Amsterdam()
    {
        var clock = new SystemClock();
        clock.Today.Should().Be(DateOnly.FromDateTime(clock.Now.DateTime));
    }
}
