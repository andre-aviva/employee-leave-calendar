// LeaveCalendar.Domain/Leave/LeaveRules.cs
using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Domain.LeaveTypes;

namespace LeaveCalendar.Domain.Leave;

public static class LeaveRules
{
    public static void EnsureEndOnOrAfterStart(DateOnly start, DateOnly end)
    {
        if (end < start) throw new DomainRuleException(LeaveErrorCodes.EndBeforeStart);
    }

    public static void EnsureStartTodayOrFuture(DateOnly start, DateOnly today)
    {
        if (start < today) throw new DomainRuleException(LeaveErrorCodes.StartDateInPast);
    }

    public static void EnsureTypeRegisterableBy(LeaveType type, Role role)
    {
        if (role == Role.Admin) return; // admin may register any type
        if (type.RegisterableBy != RegisterableBy.Employee)
            throw new DomainRuleException(LeaveErrorCodes.TypeNotRegisterable);
    }

    public static void EnsureNoOverlap(LeavePeriod candidate, IEnumerable<LeaveRegistration> existing, Guid? excludingId = null)
    {
        foreach (var reg in existing)
        {
            if (excludingId is { } id && reg.Id == id) continue;
            if (candidate.Overlaps(new LeavePeriod(reg.StartDate, reg.EndDate)))
                throw new DomainRuleException(LeaveErrorCodes.Overlap);
        }
    }

    public static void EnsureEditableByEmployee(LeaveRegistration reg, DateOnly today)
    {
        // Only future-dated registrations are editable/deletable by the employee;
        // a registration starting today or in the past is immutable.
        if (reg.StartDate <= today) throw new DomainRuleException(LeaveErrorCodes.LeaveNotModifiable);
    }
}
