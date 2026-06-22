using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Admin.ViewAuditTrail;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/api/admin/audit", Handler.HandleAsync)
           .RequireAuthorization("Admin")
           .AddEndpointFilter<ValidationFilter<Request>>()
           .WithTags("Admin");
}
