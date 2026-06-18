using FluentValidation;

namespace LeaveCalendar.Web.Features.Auth.SignIn;

public sealed class Validator : AbstractValidator<Request>
{
    public Validator()
    {
        RuleFor(x => x.Username).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}
