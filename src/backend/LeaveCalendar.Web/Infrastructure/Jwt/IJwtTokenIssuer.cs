using LeaveCalendar.Domain.Employees;

namespace LeaveCalendar.Web.Infrastructure.Jwt;

public interface IJwtTokenIssuer
{
    string Issue(Employee employee);
}
