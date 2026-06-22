using FluentValidation;

namespace LeaveCalendar.Web.Features.Admin.ViewAuditTrail;

public sealed class Validator : AbstractValidator<Request>
{
    public Validator()
    {
        // Reject a transposed range (to < from) with a 400 rather than a misleading empty 200.
        RuleFor(x => x.To)
            .GreaterThanOrEqualTo(x => x.From!.Value)
            .When(x => x.From.HasValue && x.To.HasValue)
            .WithMessage("'to' must be greater than or equal to 'from'.");
    }
}
