// LeaveCalendar.Domain/Leave/LeaveRules.cs
using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Domain.LeaveTypes;

namespace LeaveCalendar.Domain.Leave;

/// <summary>
/// Domain invariants for leave registration. Two of them apply <b>asymmetrically by role</b>, by design:
/// <list type="bullet">
///   <item><b>Self-service (Employee):</b> all rules apply — leave must start today or later
///   (<see cref="EnsureStartTodayOrFuture"/>) and only future-dated leave is editable/deletable
///   (<see cref="EnsureEditableByEmployee"/>).</item>
///   <item><b>Admin:</b> the admin create/edit/delete handlers intentionally do <b>not</b> apply
///   <see cref="EnsureStartTodayOrFuture"/> or <see cref="EnsureEditableByEmployee"/>, so an admin
///   may back-enter and correct historical leave (e.g. record past sick leave, fix an old record).
///   The role-neutral invariants — end-on-or-after-start and no-overlap — still hold for admins.</item>
/// </list>
/// This asymmetry is deliberate and confirmed (issue #36). Note: admin mutations of historical
/// records are not yet captured in an audit trail (who/when, before/after) — that traceability is
/// tracked with the deferred audit/GDPR work, not here.
/// </summary>
public static class LeaveRules
{
    public static void EnsureEndOnOrAfterStart(DateOnly start, DateOnly end)
    {
        if (end < start) throw new DomainRuleException(LeaveErrorCodes.EndBeforeStart);
    }

    // Self-service only. The admin path intentionally skips this so admins can backdate
    // (see the class summary / issue #36).
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

    // Self-service only. Only future-dated registrations are editable/deletable by the employee;
    // a registration starting today or in the past is immutable to them. The admin path
    // intentionally skips this so admins can amend historical leave (class summary / issue #36).
    public static void EnsureEditableByEmployee(LeaveRegistration reg, DateOnly today)
    {
        if (reg.StartDate <= today) throw new DomainRuleException(LeaveErrorCodes.LeaveNotModifiable);
    }
}
