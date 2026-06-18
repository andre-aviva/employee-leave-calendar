using LeaveCalendar.Web.Common;
namespace LeaveCalendar.Web.Features.Leave.DeleteMyLeave;
public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/api/me/leave/{id:guid}", Handler.HandleAsync)
           .RequireAuthorization()
           .WithTags("MyLeave");
}
