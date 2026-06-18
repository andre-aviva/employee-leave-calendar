// LeaveCalendar.UnitTests/Leave/LeavePeriodTests.cs
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using Xunit;

namespace LeaveCalendar.UnitTests.Leave;

public class LeavePeriodTests
{
    private static LeavePeriod P(int startDay, int endDay) =>
        new(new DateOnly(2026, 7, startDay), new DateOnly(2026, 7, endDay));

    [Fact] public void Identical_ranges_overlap() => P(10, 12).Overlaps(P(10, 12)).Should().BeTrue();
    [Fact] public void Contained_range_overlaps() => P(10, 20).Overlaps(P(12, 14)).Should().BeTrue();
    [Fact] public void Partial_overlap_is_true() => P(10, 15).Overlaps(P(14, 18)).Should().BeTrue();

    [Fact] // adjacency: End of A == Start of B is an OVERLAP (inclusive ranges)
    public void Adjacent_touching_ranges_overlap() => P(10, 12).Overlaps(P(12, 14)).Should().BeTrue();

    [Fact] public void Fully_separate_ranges_do_not_overlap() => P(10, 12).Overlaps(P(13, 15)).Should().BeFalse();
    [Fact] public void Overlap_is_symmetric() => P(14, 18).Overlaps(P(10, 15)).Should().BeTrue();

    [Fact] public void One_day_leave_overlaps_itself() => P(10, 10).Overlaps(P(10, 10)).Should().BeTrue();

    [Fact] public void Duration_of_one_day_leave_is_one() => P(10, 10).DurationDays.Should().Be(1);
    [Fact] public void Duration_is_inclusive() => P(10, 12).DurationDays.Should().Be(3);
}
