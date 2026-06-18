using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Reference.ListLeaveTypes;

public static class Handler
{
    public static async Task<IResult> HandleAsync(LeaveDbContext db)
    {
        var leaveTypes = await db.LeaveTypes
            .OrderBy(lt => lt.Name)
            .Select(lt => new LeaveTypeDto(lt.Id, lt.Name, lt.ColourHex, lt.RegisterableBy.ToString()))
            .ToListAsync();

        return Results.Ok(leaveTypes);
    }
}
