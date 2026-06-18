using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Calendar.ViewCalendar;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/calendar", Handler.HandleAsync)
            .RequireAuthorization()
            .AddEndpointFilter<ValidationFilter<Request>>()
            .WithName("ViewCalendar");
    }
}
