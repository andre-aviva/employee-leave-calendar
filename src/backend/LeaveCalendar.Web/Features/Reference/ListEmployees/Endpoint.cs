using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Reference.ListEmployees;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/employees", Handler.HandleAsync)
            .RequireAuthorization("Admin")
            .WithName("ListEmployees");
    }
}
