using FluentValidation;
using LeaveCalendar.Domain.Leave;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
namespace LeaveCalendar.Web.Common;
public sealed class DomainExceptionHandler(IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        ProblemDetails problem;
        switch (exception)
        {
            case UnauthorizedException:
                problem = new ProblemDetails
                {
                    Status = StatusCodes.Status401Unauthorized,
                    Title = "Unauthorized",
                    Type = "https://datatracker.ietf.org/doc/html/rfc9457"
                };
                break;
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
            // Date ordering (end < start) is a client error, not a business-rule violation:
            // it must surface as 400 regardless of whether the FluentValidation rule (the usual
            // entry path on JSON-body endpoints) or the domain rule catches it first, so the
            // END_BEFORE_START contract is identical on every endpoint. The remaining domain
            // rules (OVERLAP, START_DATE_IN_PAST, TYPE_NOT_REGISTERABLE, LEAVE_NOT_MODIFIABLE)
            // stay 422 business-rule violations.
            case DomainRuleException { Code: LeaveErrorCodes.EndBeforeStart } de:
                problem = new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Validation failed",
                    Type = "https://datatracker.ietf.org/doc/html/rfc9457"
                };
                problem.Extensions["code"] = de.Code;
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
            // The leave_registrations exclusion constraint rejects overlapping rows at the
            // database with SQLSTATE 23P01 (exclusion_violation). Translate it to the same
            // 422 OVERLAP body the in-memory pre-check produces, so a race that slips past
            // the application check still surfaces the existing client contract, not a 500.
            case DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.ExclusionViolation } }:
                problem = new ProblemDetails
                {
                    Status = StatusCodes.Status422UnprocessableEntity,
                    Title = "Business rule violation",
                    Type = "https://datatracker.ietf.org/doc/html/rfc9457"
                };
                problem.Extensions["code"] = LeaveErrorCodes.Overlap;
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
