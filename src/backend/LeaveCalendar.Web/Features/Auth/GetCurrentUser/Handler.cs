using LeaveCalendar.Web.Infrastructure.Identity;

namespace LeaveCalendar.Web.Features.Auth.GetCurrentUser;

public static class Handler
{
    public static IResult Handle(ICurrentUser currentUser) =>
        Results.Ok(new Response(currentUser.EmployeeId, currentUser.Name, currentUser.Role.ToString()));
}
