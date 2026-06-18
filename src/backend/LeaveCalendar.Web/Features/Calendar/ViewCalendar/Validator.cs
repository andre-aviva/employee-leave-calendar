using FluentValidation;

namespace LeaveCalendar.Web.Features.Calendar.ViewCalendar;

public sealed class Validator : AbstractValidator<Request>
{
    public Validator()
    {
        RuleFor(x => x.To)
            .GreaterThanOrEqualTo(x => x.From)
            .WithMessage("'To' must be greater than or equal to 'From'.");
    }
}
