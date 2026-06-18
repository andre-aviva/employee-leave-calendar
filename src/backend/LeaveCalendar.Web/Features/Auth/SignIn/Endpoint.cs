using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Auth.SignIn;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/sign-in", Handler.HandleAsync)
            .AddEndpointFilter<ValidationFilter<Request>>()
            .AllowAnonymous()
            .WithName("SignIn");
    }
}
