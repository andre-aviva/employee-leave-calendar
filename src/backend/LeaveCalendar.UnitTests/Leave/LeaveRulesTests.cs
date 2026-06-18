// LeaveCalendar.UnitTests/Leave/LeaveRulesTests.cs
using FluentAssertions;
using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Domain.LeaveTypes;
using Xunit;

namespace LeaveCalendar.UnitTests.Leave;

public class LeaveRulesTests
{
    private static DateOnly D(int day) => new(2026, 7, day);
    private static LeaveRegistration Reg(Guid id, int start, int end) =>
        new() { Id = id, EmployeeId = Guid.NewGuid(), LeaveTypeId = Guid.NewGuid(), StartDate = D(start), EndDate = D(end) };

    // --- EnsureEndOnOrAfterStart (rule 2) ---
    [Fact] public void End_after_start_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEndOnOrAfterStart(D(10), D(12))).Should().NotThrow();
    [Fact] public void Same_day_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEndOnOrAfterStart(D(10), D(10))).Should().NotThrow();
    [Fact] public void End_before_start_throws_END_BEFORE_START() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEndOnOrAfterStart(D(12), D(10)))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.EndBeforeStart);

    // --- EnsureStartTodayOrFuture (rule 4) ---
    [Fact] public void Start_today_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureStartTodayOrFuture(D(10), today: D(10))).Should().NotThrow();
    [Fact] public void Start_future_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureStartTodayOrFuture(D(11), today: D(10))).Should().NotThrow();
    [Fact] public void Start_in_past_throws_START_DATE_IN_PAST() =>
        FluentActions.Invoking(() => LeaveRules.EnsureStartTodayOrFuture(D(9), today: D(10)))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.StartDateInPast);

    // --- EnsureTypeRegisterableBy (rule 3) ---
    private static LeaveType Type(RegisterableBy by) => new() { Id = Guid.NewGuid(), Name = "X", ColourHex = "#000000", RegisterableBy = by };

    [Fact] public void Employee_can_register_employee_type() =>
        FluentActions.Invoking(() => LeaveRules.EnsureTypeRegisterableBy(Type(RegisterableBy.Employee), Role.Employee)).Should().NotThrow();
    [Fact] public void Employee_cannot_register_admin_type() =>
        FluentActions.Invoking(() => LeaveRules.EnsureTypeRegisterableBy(Type(RegisterableBy.Admin), Role.Employee))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.TypeNotRegisterable);
    [Fact] public void Admin_can_register_any_type() =>
        FluentActions.Invoking(() => LeaveRules.EnsureTypeRegisterableBy(Type(RegisterableBy.Admin), Role.Admin)).Should().NotThrow();
    [Fact] public void Admin_can_register_employee_type() =>
        FluentActions.Invoking(() => LeaveRules.EnsureTypeRegisterableBy(Type(RegisterableBy.Employee), Role.Admin)).Should().NotThrow();

    // --- EnsureNoOverlap (rule 1) ---
    [Fact] public void No_overlap_with_separate_existing_passes()
    {
        var existing = new[] { Reg(Guid.NewGuid(), 1, 3) };
        FluentActions.Invoking(() => LeaveRules.EnsureNoOverlap(new LeavePeriod(D(10), D(12)), existing)).Should().NotThrow();
    }
    [Fact] public void Overlap_throws_OVERLAP()
    {
        var existing = new[] { Reg(Guid.NewGuid(), 11, 13) };
        FluentActions.Invoking(() => LeaveRules.EnsureNoOverlap(new LeavePeriod(D(10), D(12)), existing))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.Overlap);
    }
    [Fact] public void Adjacency_is_treated_as_overlap()
    {
        var existing = new[] { Reg(Guid.NewGuid(), 12, 14) };
        FluentActions.Invoking(() => LeaveRules.EnsureNoOverlap(new LeavePeriod(D(10), D(12)), existing))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.Overlap);
    }
    [Fact] public void Excluded_self_does_not_count_as_overlap()
    {
        var self = Reg(Guid.NewGuid(), 10, 12);
        FluentActions.Invoking(() => LeaveRules.EnsureNoOverlap(new LeavePeriod(D(10), D(12)), new[] { self }, excludingId: self.Id)).Should().NotThrow();
    }

    // --- EnsureEditableByEmployee (rule 3: only future-dated own leave) ---
    [Fact] public void Editing_future_dated_leave_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEditableByEmployee(Reg(Guid.NewGuid(), 11, 12), today: D(10))).Should().NotThrow();
    [Fact] public void Editing_today_dated_leave_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEditableByEmployee(Reg(Guid.NewGuid(), 10, 12), today: D(10))).Should().NotThrow();
    [Fact] public void Editing_past_dated_leave_throws_LEAVE_NOT_MODIFIABLE() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEditableByEmployee(Reg(Guid.NewGuid(), 9, 12), today: D(10)))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.LeaveNotModifiable);
}
