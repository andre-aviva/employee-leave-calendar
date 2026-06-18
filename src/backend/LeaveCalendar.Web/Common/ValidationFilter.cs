using FluentValidation;
namespace LeaveCalendar.Web.Common;
public sealed class ValidationFilter<TRequest>(IValidator<TRequest> validator) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var request = context.Arguments.OfType<TRequest>().FirstOrDefault();
        if (request is not null)
        {
            var result = await validator.ValidateAsync(request);
            if (!result.IsValid) throw new ValidationException(result.Errors); // -> 400 via DomainExceptionHandler
        }
        return await next(context);
    }
}
