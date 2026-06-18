using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Auth.GetCurrentUser;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/me", Handler.Handle)
            .RequireAuthorization()
            .WithName("GetCurrentUser");
    }
}
