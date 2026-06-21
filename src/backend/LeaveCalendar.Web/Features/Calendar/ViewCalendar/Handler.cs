using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Calendar.ViewCalendar;

public static class Handler
{
    // Calendar visibility (issue #23): the team calendar is intentionally org-wide —
    // every authenticated user sees who is off and when. Privacy-sensitive leave types
    // (LeaveType.IsSensitive, e.g. Sick Leave) are redacted to a generic "Unavailable"
    // block for callers who are neither an admin nor the leave's owner, so the schedule
    // stays useful without disclosing health-related leave. Description/Notes are never
    // exposed here regardless of role.
    private const string RedactedName = "Unavailable";
    private const string RedactedColour = "#9E9E9E";

    public static async Task<IResult> HandleAsync([AsParameters] Request request, LeaveDbContext db, ICurrentUser user, CancellationToken ct)
    {
        var rows = await (
            from r in db.LeaveRegistrations
            where r.StartDate <= request.To && request.From <= r.EndDate
            join e in db.Employees on r.EmployeeId equals e.Id
            join t in db.LeaveTypes on r.LeaveTypeId equals t.Id
            orderby r.StartDate
            select new
            {
                r.Id,
                r.EmployeeId,
                EmployeeName = e.Name,
                r.LeaveTypeId,
                LeaveTypeName = t.Name,
                t.ColourHex,
                t.IsSensitive,
                r.StartDate,
                r.EndDate
            }).ToListAsync(ct);

        var isAdmin = user.IsAdmin;
        var callerId = user.EmployeeId;

        var result = rows.Select(x =>
        {
            var revealDetail = isAdmin || x.EmployeeId == callerId || !x.IsSensitive;
            return new CalendarEntryDto(
                x.Id,
                x.EmployeeId,
                x.EmployeeName,
                revealDetail ? x.LeaveTypeId : Guid.Empty,
                revealDetail ? x.LeaveTypeName : RedactedName,
                revealDetail ? x.ColourHex : RedactedColour,
                x.StartDate.ToString("yyyy-MM-dd"),
                x.EndDate.ToString("yyyy-MM-dd"));
        }).ToList();

        return Results.Ok(result);
    }
}
