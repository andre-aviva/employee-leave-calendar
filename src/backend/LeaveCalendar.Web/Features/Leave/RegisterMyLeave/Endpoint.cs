using LeaveCalendar.Web.Common;
namespace LeaveCalendar.Web.Features.Leave.RegisterMyLeave;
public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/api/me/leave", Handler.HandleAsync)
           .AddEndpointFilter<ValidationFilter<Request>>()
           .RequireAuthorization()
           .WithTags("MyLeave");
}
