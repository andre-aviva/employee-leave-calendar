using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Admin.AdminCreateLeave;

public static class Handler
{
    public static async Task<IResult> HandleAsync(Request request, LeaveDbContext db, CancellationToken ct)
    {
        // Load employee → 404 if missing
        var employee = await db.Employees.FirstOrDefaultAsync(e => e.Id == request.EmployeeId, ct);
        if (employee is null) return Results.NotFound();

        // Load type → 404 if missing
        var type = await db.LeaveTypes.FirstOrDefaultAsync(t => t.Id == request.LeaveTypeId, ct);
        if (type is null) return Results.NotFound();

        // Domain invariants (admin: no date/type-eligibility restriction)
        LeaveRules.EnsureEndOnOrAfterStart(request.StartDate, request.EndDate);

        // Overlap check against that employee's existing leave
        var existing = await db.LeaveRegistrations
            .Where(r => r.EmployeeId == request.EmployeeId)
            .ToListAsync(ct);
        LeaveRules.EnsureNoOverlap(new LeavePeriod(request.StartDate, request.EndDate), existing);

        var reg = new LeaveRegistration
        {
            Id = Guid.NewGuid(),
            EmployeeId = request.EmployeeId,
            LeaveTypeId = request.LeaveTypeId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Description = request.Description,
            Notes = request.Notes
        };
        db.LeaveRegistrations.Add(reg);
        await db.SaveChangesAsync(ct);

        var response = new Response(
            reg.Id,
            reg.EmployeeId,
            reg.LeaveTypeId,
            reg.StartDate.ToString("yyyy-MM-dd"),
            reg.EndDate.ToString("yyyy-MM-dd"),
            reg.Description,
            reg.Notes);
        return Results.Created($"/api/admin/leave/{reg.Id}", response);
    }
}
