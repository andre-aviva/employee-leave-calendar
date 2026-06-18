namespace LeaveCalendar.Domain.Leave;

public sealed class DomainRuleException(string code, string? message = null)
    : Exception(message ?? code)
{
    public string Code { get; } = code;
}
