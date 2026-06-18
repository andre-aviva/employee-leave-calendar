namespace LeaveCalendar.Domain.Leave;

public sealed class LeaveRegistration
{
    public Guid Id { get; init; }
    public Guid EmployeeId { get; init; }
    public Guid LeaveTypeId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? Description { get; set; } // <= 50 chars (enforced by validators/DB)
    public string? Notes { get; set; }       // <= 500 chars
}
