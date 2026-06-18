using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Admin.AdminEditLeave;

public static class Handler
{
    public static async Task<IResult> HandleAsync(Guid id, Request request, LeaveDbContext db, CancellationToken ct)
    {
        // Load registration by id (any employee) → 404 if missing
        var registration = await db.LeaveRegistrations.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (registration is null) return Results.NotFound();

        // Load leave type → 404 if missing
        var type = await db.LeaveTypes.FirstOrDefaultAsync(t => t.Id == request.LeaveTypeId, ct);
        if (type is null) return Results.NotFound();

        // Domain invariants (admin: no date/type-eligibility restriction)
        LeaveRules.EnsureEndOnOrAfterStart(request.StartDate, request.EndDate);

        // Overlap check against the registration's employee's other leave (excluding self)
        var employeeRegs = await db.LeaveRegistrations
            .Where(r => r.EmployeeId == registration.EmployeeId)
            .ToListAsync(ct);
        LeaveRules.EnsureNoOverlap(new LeavePeriod(request.StartDate, request.EndDate), employeeRegs, excludingId: id);

        // Mutate and persist
        registration.LeaveTypeId = request.LeaveTypeId;
        registration.StartDate = request.StartDate;
        registration.EndDate = request.EndDate;
        registration.Description = request.Description;
        registration.Notes = request.Notes;
        await db.SaveChangesAsync(ct);

        return Results.Ok(new Response(
            registration.Id,
            registration.EmployeeId,
            registration.LeaveTypeId,
            registration.StartDate.ToString("yyyy-MM-dd"),
            registration.EndDate.ToString("yyyy-MM-dd"),
            registration.Description,
            registration.Notes));
    }
}
