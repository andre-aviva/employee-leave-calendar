using FluentValidation;

namespace LeaveCalendar.Web.Features.Calendar.ViewCalendar;

public sealed class Validator : AbstractValidator<Request>
{
    /// <summary>Maximum span the calendar window may cover, to bound the query.</summary>
    public const int MaxWindowMonths = 12;

    public Validator()
    {
        // With [AsParameters] binding an omitted query param binds to default(DateOnly)
        // (0001-01-01). Require both ends explicitly so a missing 'from'/'to' can't return
        // the org's entire leave history.
        RuleFor(x => x.From)
            .Must(d => d != default)
            .WithMessage("'from' is required (yyyy-MM-dd).");

        RuleFor(x => x.To)
            .Must(d => d != default)
            .WithMessage("'to' is required (yyyy-MM-dd).");

        RuleFor(x => x.To)
            .GreaterThanOrEqualTo(x => x.From)
            .WithMessage("'to' must be greater than or equal to 'from'.");

        // Cap the window so a single request can't pull an unbounded range.
        RuleFor(x => x.To)
            .Must((req, to) => to <= req.From.AddMonths(MaxWindowMonths))
            .When(x => x.From != default && x.To != default)
            .WithMessage($"The calendar window must not exceed {MaxWindowMonths} months.");
    }
}
