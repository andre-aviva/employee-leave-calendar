# LeaveCalendar.Web

Minimal-API host. Each use-case is one slice folder under `Features/<Area>/<UseCase>/` containing its Endpoint, Request/Response records (slice-local), Handler, and a Validator where shape validation applies. Slices never reference each other. Endpoints implement `IEndpoint` and are auto-registered by scanning in `Program.cs`. No MediatR.

- `Infrastructure/`: LeaveDbContext, SystemClock, CurrentUser, seed data, JWT.
- `Common/`: IEndpoint, endpoint registration, ProblemDetails mapping (RFC 9457), Result.
