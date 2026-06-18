# Features (vertical slices)

The Features tree reads like the requirements. One folder per use-case.

- `Auth/`: SignIn (POST /api/auth/sign-in), GetCurrentUser (GET /api/auth/me).
- `Reference/`: ListLeaveTypes (GET /api/leave-types), ListEmployees (GET /api/employees, admin).
- `Calendar/`: ViewCalendar (GET /api/calendar?from=&to=).
- `Leave/`: ListMyLeave and RegisterMyLeave (GET|POST /api/me/leave), EditMyLeave and DeleteMyLeave (PUT|DELETE /api/me/leave/{id}).
- `Admin/`: ListAllLeave (GET /api/admin/leave), AdminCreateLeave (POST), AdminEditLeave and AdminDeleteLeave (PUT|DELETE /api/admin/leave/{id}).

Adding a feature means adding a folder here. Never add a central controller or shared service.
