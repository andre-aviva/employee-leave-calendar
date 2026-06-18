using FluentValidation;

namespace LeaveCalendar.Web.Features.Admin.AdminCreateLeave;

public sealed class Validator : AbstractValidator<Request>
{
    public Validator()
    {
        RuleFor(x => x.EmployeeId).NotEmpty();
        RuleFor(x => x.LeaveTypeId).NotEmpty();
        RuleFor(x => x.EndDate).GreaterThanOrEqualTo(x => x.StartDate);
        RuleFor(x => x.Description).MaximumLength(50);
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}
