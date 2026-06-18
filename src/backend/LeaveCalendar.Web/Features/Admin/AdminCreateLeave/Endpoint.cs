using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Admin.AdminCreateLeave;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/api/admin/leave", Handler.HandleAsync)
           .AddEndpointFilter<ValidationFilter<Request>>()
           .RequireAuthorization("Admin")
           .WithTags("Admin");
}
