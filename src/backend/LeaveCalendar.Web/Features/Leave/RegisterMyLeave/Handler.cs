using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using LeaveCalendar.Web.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Features.Leave.RegisterMyLeave;
public static class Handler
{
    public static async Task<IResult> HandleAsync(Request request, LeaveDbContext db, ICurrentUser user, IClock clock, CancellationToken ct)
    {
        var type = await db.LeaveTypes.FirstOrDefaultAsync(t => t.Id == request.LeaveTypeId, ct);
        if (type is null) return Results.NotFound();

        LeaveRules.EnsureEndOnOrAfterStart(request.StartDate, request.EndDate);
        LeaveRules.EnsureTypeRegisterableBy(type, user.Role);
        LeaveRules.EnsureStartTodayOrFuture(request.StartDate, clock.Today);

        var existing = await db.LeaveRegistrations.Where(r => r.EmployeeId == user.EmployeeId).ToListAsync(ct);
        LeaveRules.EnsureNoOverlap(new LeavePeriod(request.StartDate, request.EndDate), existing);

        var reg = new LeaveRegistration
        {
            Id = Guid.NewGuid(),
            EmployeeId = user.EmployeeId,
            LeaveTypeId = request.LeaveTypeId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Description = request.Description,
            Notes = request.Notes
        };
        db.LeaveRegistrations.Add(reg);
        await db.SaveChangesAsync(ct);

        var response = new Response(reg.Id, reg.LeaveTypeId,
            reg.StartDate.ToString("yyyy-MM-dd"), reg.EndDate.ToString("yyyy-MM-dd"), reg.Description, reg.Notes);
        return Results.Created($"/api/me/leave/{reg.Id}", response);
    }
}
