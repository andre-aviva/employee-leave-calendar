using FluentValidation;

namespace LeaveCalendar.Web.Features.Admin.ListAllLeave;

public sealed class Validator : AbstractValidator<Request>
{
    public Validator()
    {
        // Reject a transposed range (to < from) with a 400 instead of silently
        // returning an empty 200 that an admin could misread as "no leave exists".
        RuleFor(x => x.To)
            .GreaterThanOrEqualTo(x => x.From!.Value)
            .When(x => x.From.HasValue && x.To.HasValue)
            .WithMessage("'to' must be greater than or equal to 'from'.");
    }
}
