using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Calendar.ViewCalendar;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        // Org-wide team calendar: any authenticated user may see who is off and when
        // (intended product behaviour). Privacy-sensitive leave types are redacted for
        // non-admin/non-owner callers in the handler — see Handler for the visibility rule.
        app.MapGet("/api/calendar", Handler.HandleAsync)
            .RequireAuthorization()
            .AddEndpointFilter<ValidationFilter<Request>>()
            .WithName("ViewCalendar");
    }
}
