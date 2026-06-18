namespace LeaveCalendar.Web.Infrastructure.Time;
public interface IClock { DateOnly Today { get; } DateTimeOffset Now { get; } }
