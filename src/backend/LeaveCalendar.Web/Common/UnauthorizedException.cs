namespace LeaveCalendar.Web.Common;

/// <summary>
/// Thrown when a JWT is structurally valid but is missing or contains an unparseable
/// required claim (e.g. <c>sub</c> or <c>role</c>). Maps to HTTP 401.
/// </summary>
public sealed class UnauthorizedException(string message) : Exception(message);
