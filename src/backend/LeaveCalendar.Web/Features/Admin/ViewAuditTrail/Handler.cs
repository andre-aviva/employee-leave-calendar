using System.Text.Json;
using LeaveCalendar.Web.Common;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Admin.ViewAuditTrail;

public static class Handler
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    public static async Task<IResult> HandleAsync(
        [AsParameters] Request request,
        LeaveDbContext db,
        CancellationToken ct)
    {
        var actualPage = (request.Page is null or < 1) ? 1 : request.Page.Value;
        var actualPageSize = (request.PageSize is null or < 1)
            ? DefaultPageSize
            : Math.Min(request.PageSize.Value, MaxPageSize);

        var query = db.AuditLog.AsQueryable();

        if (request.SubjectEmployeeId is { } subject)
            query = query.Where(x => x.SubjectEmployeeId == subject);

        if (request.Action is { } action)
            query = query.Where(x => x.Action == action);

        if (request.From is { } from)
        {
            var fromTs = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            query = query.Where(x => x.OccurredAt >= fromTs);
        }

        if (request.To is { } to)
        {
            // Inclusive upper bound: everything before the start of the next UTC day.
            var toExclusive = new DateTimeOffset(to.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            query = query.Where(x => x.OccurredAt < toExclusive);
        }

        var totalCount = await query.CountAsync(ct);
        var totalPages = (int)Math.Ceiling(totalCount / (double)actualPageSize);
        actualPage = Math.Min(actualPage, Math.Max(totalPages, 1));

        var rows = await query
            .OrderByDescending(x => x.OccurredAt)
            .Skip((actualPage - 1) * actualPageSize)
            .Take(actualPageSize)
            .ToListAsync(ct);

        // Materialize DTOs in memory: format the timestamp and re-embed the jsonb change set as
        // raw JSON (Deserialize<JsonElement> detaches it from any backing document).
        var items = rows.Select(x => new AuditEntryDto(
            x.Id,
            x.OccurredAt.ToString("o"),
            x.Action.ToString(),
            x.EntityId,
            x.SubjectEmployeeId,
            x.ActorEmployeeId,
            x.ActorName,
            x.ActorRole,
            JsonSerializer.Deserialize<JsonElement>(x.Changes))).ToList();

        var result = new PagedResult<AuditEntryDto>(items, actualPage, actualPageSize, totalCount, totalPages);
        return Results.Ok(result);
    }
}
