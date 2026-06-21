namespace LeaveCalendar.Domain.LeaveTypes;

public sealed class LeaveType
{
    public Guid Id { get; init; }
    public required string Name { get; set; }
    public required string ColourHex { get; set; }
    public RegisterableBy RegisterableBy { get; set; }

    /// <summary>
    /// When true, this leave type is privacy-sensitive (e.g. Sick Leave). On the shared
    /// team calendar its specifics are redacted for callers who are neither an admin nor
    /// the leave's owner; the time block stays visible as a generic "Unavailable".
    /// </summary>
    public bool IsSensitive { get; set; }
}
