namespace LeaveCalendar.Domain.Leave;

public static class LeaveErrorCodes
{
    public const string Overlap = "OVERLAP";                       // FE contract
    public const string TypeNotRegisterable = "TYPE_NOT_REGISTERABLE"; // FE contract
    public const string StartDateInPast = "START_DATE_IN_PAST";    // FE contract
    public const string EndBeforeStart = "END_BEFORE_START";       // internal (validator returns 400 first)
    public const string LeaveNotModifiable = "LEAVE_NOT_MODIFIABLE"; // internal: past-dated own leave edit/delete
}
