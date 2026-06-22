using System.Text.Json;

namespace LeaveCalendar.Web.Features.Admin.ViewAuditTrail;

public sealed record AuditEntryDto(
    Guid Id,
    string OccurredAt,
    string Action,
    Guid EntityId,
    Guid SubjectEmployeeId,
    Guid? ActorEmployeeId,
    string ActorName,
    string ActorRole,
    JsonElement Changes);
