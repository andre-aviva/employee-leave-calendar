using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Admin.AdminEditLeave;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapPut("/api/admin/leave/{id:guid}", Handler.HandleAsync)
           .AddEndpointFilter<ValidationFilter<Request>>()
           .RequireAuthorization("Admin")
           .WithTags("Admin");
}
