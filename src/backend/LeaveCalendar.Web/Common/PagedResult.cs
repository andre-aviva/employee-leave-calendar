namespace LeaveCalendar.Web.Common;

/// <summary>
/// The shared pagination envelope for list endpoints. Lives in Common (not a feature slice)
/// because it is a cross-cutting response shape, not the DTO of any one slice — slices supply
/// the item type <typeparamref name="T"/> (e.g. AdminLeaveDto).
/// </summary>
public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
