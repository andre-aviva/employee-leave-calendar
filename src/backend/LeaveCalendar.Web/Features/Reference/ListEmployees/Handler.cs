using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Reference.ListEmployees;

public static class Handler
{
    public static async Task<IResult> HandleAsync(LeaveDbContext db)
    {
        var employees = await db.Employees
            .OrderBy(e => e.Name)
            .Select(e => new EmployeeDto(e.Id, e.Name, e.Role.ToString()))
            .ToListAsync();

        return Results.Ok(employees);
    }
}
