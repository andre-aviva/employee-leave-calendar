# Backend, Leave Calendar Web API

ASP.NET Core (.NET 10) Web API using EF Core 10 and PostgreSQL. Architectural style: Vertical Slice + Screaming. Organise by use-case, not by layer. There is no Controllers, Services, or Repositories folder.

## Projects

- `LeaveCalendar.Domain`: entities, enums, and invariants (`LeaveRules`). No framework references.
- `LeaveCalendar.Web`: the `Features/` slices, `Infrastructure/` (DbContext, clock, current-user, seed, JWT), `Common/` (IEndpoint, endpoint registration, ProblemDetails, Result), and `Program.cs`.
- `LeaveCalendar.UnitTests`: Domain invariants and handler rules, no database. xUnit + FluentAssertions.
- `LeaveCalendar.IntegrationTests`: endpoints against real PostgreSQL via Testcontainers.

Reference: Backend Architecture (Confluence), Vertical Slice + Screaming.
