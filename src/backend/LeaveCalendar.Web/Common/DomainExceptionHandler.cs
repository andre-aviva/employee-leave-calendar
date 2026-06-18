using FluentValidation;
using LeaveCalendar.Domain.Leave;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
namespace LeaveCalendar.Web.Common;
public sealed class DomainExceptionHandler(IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        ProblemDetails problem;
        switch (exception)
        {
            case ValidationException ve:
                problem = new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Validation failed",
                    Type = "https://datatracker.ietf.org/doc/html/rfc9457"
                };
                problem.Extensions["errors"] = ve.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
                break;
            case DomainRuleException de:
                problem = new ProblemDetails
                {
                    Status = StatusCodes.Status422UnprocessableEntity,
                    Title = "Business rule violation",
                    Type = "https://datatracker.ietf.org/doc/html/rfc9457"
                };
                problem.Extensions["code"] = de.Code;
                break;
            default:
                return false; // let the framework produce a 500
        }
        httpContext.Response.StatusCode = problem.Status!.Value;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem
        });
    }
}
