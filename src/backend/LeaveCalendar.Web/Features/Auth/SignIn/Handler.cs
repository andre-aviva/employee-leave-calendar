using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Jwt;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Auth.SignIn;

public static class Handler
{
    public static async Task<IResult> HandleAsync(
        Request request,
        LeaveDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenIssuer tokenIssuer,
        CancellationToken ct)
    {
        var employee = await db.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Username == request.Username, ct);

        if (employee is null || !passwordHasher.Verify(request.Password, employee.PasswordHash))
            return Results.Unauthorized();

        var token = tokenIssuer.Issue(employee);
        return Results.Ok(new Response(token, employee.Name, employee.Role.ToString()));
    }
}
