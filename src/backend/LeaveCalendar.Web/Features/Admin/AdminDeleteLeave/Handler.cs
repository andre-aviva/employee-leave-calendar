using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Admin.AdminDeleteLeave;

public static class Handler
{
    public static async Task<IResult> HandleAsync(Guid id, LeaveDbContext db, CancellationToken ct)
    {
        // Load by id (any employee) → 404 if missing
        var registration = await db.LeaveRegistrations.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (registration is null) return Results.NotFound();

        // Remove and save → 204 (no date restriction for admin)
        db.LeaveRegistrations.Remove(registration);
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }
}
