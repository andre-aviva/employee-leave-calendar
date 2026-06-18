namespace LeaveCalendar.Domain.LeaveTypes;

public sealed class LeaveType
{
    public Guid Id { get; init; }
    public required string Name { get; set; }
    public required string ColourHex { get; set; }
    public RegisterableBy RegisterableBy { get; set; }
}
