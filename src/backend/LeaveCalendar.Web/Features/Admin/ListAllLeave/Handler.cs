using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Admin.ListAllLeave;

public static class Handler
{
    public static async Task<IResult> HandleAsync(
        Guid? employeeId,
        Guid[]? leaveTypeId,
        DateOnly? from,
        DateOnly? to,
        int? page,
        int? pageSize,
        LeaveDbContext db,
        CancellationToken ct)
    {
        var actualPage = (page is null or < 1) ? 1 : page.Value;
        var actualPageSize = (pageSize is null or < 1) ? 20 : pageSize.Value;

        var query =
            from r in db.LeaveRegistrations
            join e in db.Employees on r.EmployeeId equals e.Id
            join t in db.LeaveTypes on r.LeaveTypeId equals t.Id
            select new { r, e, t };

        if (employeeId is { } empId)
            query = query.Where(x => x.r.EmployeeId == empId);

        if (leaveTypeId is { Length: > 0 })
            query = query.Where(x => leaveTypeId.Contains(x.r.LeaveTypeId));

        if (from is { } fromDate)
            query = query.Where(x => x.r.EndDate >= fromDate);

        if (to is { } toDate)
            query = query.Where(x => x.r.StartDate <= toDate);

        var totalCount = await query.CountAsync(ct);

        var totalPages = (int)Math.Ceiling(totalCount / (double)actualPageSize);

        // Clamp page to [1, max(totalPages, 1)] so an out-of-range page returns the last page
        actualPage = Math.Min(actualPage, Math.Max(totalPages, 1));

        var rows = await query
            .OrderByDescending(x => x.r.StartDate)
            .Skip((actualPage - 1) * actualPageSize)
            .Take(actualPageSize)
            .Select(x => new
            {
                x.r.Id,
                x.r.EmployeeId,
                EmployeeName = x.e.Name,
                x.r.LeaveTypeId,
                LeaveTypeName = x.t.Name,
                x.t.ColourHex,
                x.r.StartDate,
                x.r.EndDate,
                x.r.Description,
                x.r.Notes
            })
            .ToListAsync(ct);

        // Materialize dates in memory after ToListAsync — no ToString inside the EF query
        var items = rows.Select(x => new AdminLeaveDto(
            x.Id,
            x.EmployeeId,
            x.EmployeeName,
            x.LeaveTypeId,
            x.LeaveTypeName,
            x.ColourHex,
            x.StartDate.ToString("yyyy-MM-dd"),
            x.EndDate.ToString("yyyy-MM-dd"),
            x.Description,
            x.Notes)).ToList();

        var result = new PagedResult<AdminLeaveDto>(items, actualPage, actualPageSize, totalCount, totalPages);
        return Results.Ok(result);
    }
}
