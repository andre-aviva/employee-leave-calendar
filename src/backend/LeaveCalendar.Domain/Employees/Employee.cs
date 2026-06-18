namespace LeaveCalendar.Domain.Employees;

public sealed class Employee
{
    public Guid Id { get; init; }
    public required string Name { get; set; }
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public Role Role { get; set; }
}
