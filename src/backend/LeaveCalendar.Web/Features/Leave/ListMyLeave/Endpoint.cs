using LeaveCalendar.Web.Common;
namespace LeaveCalendar.Web.Features.Leave.ListMyLeave;
public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/api/me/leave", Handler.HandleAsync)
           .RequireAuthorization()
           .WithTags("MyLeave");
}
