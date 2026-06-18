using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Features.Leave.ListMyLeave;
public static class Handler
{
    public static async Task<IResult> HandleAsync(LeaveDbContext db, ICurrentUser user, CancellationToken ct)
    {
        var rows = await (
            from r in db.LeaveRegistrations
            where r.EmployeeId == user.EmployeeId
            join t in db.LeaveTypes on r.LeaveTypeId equals t.Id
            orderby r.StartDate descending
            select new
            {
                r.Id,
                r.LeaveTypeId,
                LeaveTypeName = t.Name,
                t.ColourHex,
                r.StartDate,
                r.EndDate,
                r.Description,
                r.Notes
            }).ToListAsync(ct);

        var result = rows.Select(x => new MyLeaveDto(
            x.Id, x.LeaveTypeId, x.LeaveTypeName, x.ColourHex,
            x.StartDate.ToString("yyyy-MM-dd"), x.EndDate.ToString("yyyy-MM-dd"),
            x.Description, x.Notes)).ToList();

        return Results.Ok(result);
    }
}
