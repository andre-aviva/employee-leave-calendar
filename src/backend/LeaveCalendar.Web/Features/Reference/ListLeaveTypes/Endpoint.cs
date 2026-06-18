using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Reference.ListLeaveTypes;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/leave-types", Handler.HandleAsync)
            .RequireAuthorization()
            .WithName("ListLeaveTypes");
    }
}
