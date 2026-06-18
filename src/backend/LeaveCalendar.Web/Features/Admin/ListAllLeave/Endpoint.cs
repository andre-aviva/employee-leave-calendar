using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Admin.ListAllLeave;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/api/admin/leave", Handler.HandleAsync)
           .RequireAuthorization("Admin")
           .WithTags("Admin");
}
