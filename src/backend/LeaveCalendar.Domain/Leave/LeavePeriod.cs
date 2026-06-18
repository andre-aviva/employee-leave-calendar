// LeaveCalendar.Domain/Leave/LeavePeriod.cs
namespace LeaveCalendar.Domain.Leave;

public readonly record struct LeavePeriod(DateOnly Start, DateOnly End)
{
    // Inclusive ranges: a touches b when a.Start <= b.End AND b.Start <= a.End.
    public bool Overlaps(LeavePeriod other) => Start <= other.End && other.Start <= End;

    public int DurationDays => End.DayNumber - Start.DayNumber + 1;
}
