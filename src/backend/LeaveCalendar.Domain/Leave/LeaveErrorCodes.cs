namespace LeaveCalendar.Domain.Leave;

public static class LeaveErrorCodes
{
    public const string Overlap = "OVERLAP";                       // FE contract
    public const string TypeNotRegisterable = "TYPE_NOT_REGISTERABLE"; // FE contract
    public const string StartDateInPast = "START_DATE_IN_PAST";    // FE contract
    public const string EndBeforeStart = "END_BEFORE_START";       // 400 client error on every path (validator first; domain rule mapped to 400 too)
    public const string LeaveNotModifiable = "LEAVE_NOT_MODIFIABLE"; // internal: past-dated own leave edit/delete
}
