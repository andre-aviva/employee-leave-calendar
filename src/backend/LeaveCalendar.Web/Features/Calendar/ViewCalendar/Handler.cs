using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Calendar.ViewCalendar;

public static class Handler
{
    public static async Task<IResult> HandleAsync([AsParameters] Request request, LeaveDbContext db, CancellationToken ct)
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
                r.StartDate,
                r.EndDate
            }).ToListAsync(ct);

        var result = rows.Select(x => new CalendarEntryDto(
            x.Id, x.EmployeeId, x.EmployeeName, x.LeaveTypeId, x.LeaveTypeName, x.ColourHex,
            x.StartDate.ToString("yyyy-MM-dd"), x.EndDate.ToString("yyyy-MM-dd"))).ToList();

        return Results.Ok(result);
    }
}
