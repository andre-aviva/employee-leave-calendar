using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using LeaveCalendar.Web.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Features.Leave.DeleteMyLeave;
public static class Handler
{
    public static async Task<IResult> HandleAsync(Guid id, LeaveDbContext db, ICurrentUser user, IClock clock, CancellationToken ct)
    {
        var reg = await db.LeaveRegistrations.FirstOrDefaultAsync(r => r.Id == id && r.EmployeeId == user.EmployeeId, ct);
        if (reg is null) return Results.NotFound();

        LeaveRules.EnsureEditableByEmployee(reg, clock.Today);

        db.LeaveRegistrations.Remove(reg);
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }
}
