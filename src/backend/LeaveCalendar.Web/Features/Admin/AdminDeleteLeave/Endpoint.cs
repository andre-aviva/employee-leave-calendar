using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Admin.AdminDeleteLeave;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/api/admin/leave/{id:guid}", Handler.HandleAsync)
           .RequireAuthorization("Admin")
           .WithTags("Admin");
}
