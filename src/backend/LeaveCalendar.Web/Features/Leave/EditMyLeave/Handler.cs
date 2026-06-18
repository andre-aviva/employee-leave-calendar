using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using LeaveCalendar.Web.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Features.Leave.EditMyLeave;
public static class Handler
{
    public static async Task<IResult> HandleAsync(Guid id, Request request, LeaveDbContext db, ICurrentUser user, IClock clock, CancellationToken ct)
    {
        // 1. Load registration scoped to caller's EmployeeId (hides other employees' leave)
        var existing = await db.LeaveRegistrations.FirstOrDefaultAsync(r => r.Id == id && r.EmployeeId == user.EmployeeId, ct);
        if (existing is null) return Results.NotFound();

        // 2. Ensure the existing registration is still editable (start date must not be in the past)
        LeaveRules.EnsureEditableByEmployee(existing, clock.Today);

        // 3. Validate the leave type and new dates
        var type = await db.LeaveTypes.FirstOrDefaultAsync(t => t.Id == request.LeaveTypeId, ct);
        if (type is null) return Results.NotFound();

        LeaveRules.EnsureEndOnOrAfterStart(request.StartDate, request.EndDate);
        LeaveRules.EnsureTypeRegisterableBy(type, user.Role);
        LeaveRules.EnsureStartTodayOrFuture(request.StartDate, clock.Today);

        // 4. Ensure no overlap with caller's other registrations (excluding this one to allow edit-in-place)
        var callersRegs = await db.LeaveRegistrations.Where(r => r.EmployeeId == user.EmployeeId).ToListAsync(ct);
        LeaveRules.EnsureNoOverlap(new LeavePeriod(request.StartDate, request.EndDate), callersRegs, excludingId: id);

        // 5. Mutate and persist
        existing.LeaveTypeId = request.LeaveTypeId;
        existing.StartDate = request.StartDate;
        existing.EndDate = request.EndDate;
        existing.Description = request.Description;
        existing.Notes = request.Notes;
        await db.SaveChangesAsync(ct);

        return Results.Ok(new Response(
            existing.Id,
            existing.LeaveTypeId,
            existing.StartDate.ToString("yyyy-MM-dd"),
            existing.EndDate.ToString("yyyy-MM-dd"),
            existing.Description,
            existing.Notes));
    }
}
