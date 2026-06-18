using LeaveCalendar.Domain.Employees;

namespace LeaveCalendar.Web.Infrastructure.Identity;

public interface ICurrentUser
{
    Guid EmployeeId { get; }
    Role Role { get; }
    bool IsAdmin { get; }
    string Name { get; }
}
