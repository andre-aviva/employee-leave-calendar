# LeaveCalendar.Domain

Entities (Employee, LeaveType, LeaveRegistration), enums, and the business invariants. No framework references.

`Leave/LeaveRules.cs` is the single home for shared business rules (Tier 2): no-overlap, EndDate >= StartDate, registerable-by-role, ownership and future-date checks, start-date today-or-future, and computed DurationDays. Write slices call these rules and never re-implement them inline.
