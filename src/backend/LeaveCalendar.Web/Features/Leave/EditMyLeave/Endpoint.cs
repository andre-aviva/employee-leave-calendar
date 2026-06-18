using LeaveCalendar.Web.Common;
namespace LeaveCalendar.Web.Features.Leave.EditMyLeave;
public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapPut("/api/me/leave/{id:guid}", Handler.HandleAsync)
           .AddEndpointFilter<ValidationFilter<Request>>()
           .RequireAuthorization()
           .WithTags("MyLeave");
}
