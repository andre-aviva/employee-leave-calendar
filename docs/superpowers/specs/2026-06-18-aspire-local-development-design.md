# Aspire-orchestrated local development — design

- **Date:** 2026-06-18
- **Status:** Approved (design); pending implementation plan
- **Topic:** Use Aspire to orchestrate local development for the easiest possible onboarding, given a separate team owns the frontend build.

## Context

The backend is complete (.NET 10 vertical-slice Web API, JWT auth, EF Core + PostgreSQL, full feature
slices, unit + integration tests). The frontend is a structure-only scaffold (folders with READMEs and
`.gitkeep`, no build files). `infra/` is stubs.

Today's onboarding friction: `appsettings.Development.json` hardcodes
`Host=localhost;Port=5432;Database=leavecalendar;Username=postgres;Password=postgres`, so a new developer
must install and run PostgreSQL by hand — there is no compose file. The API migrates and seeds on startup.

**Aspire today (v13, current major):** rebranded from ".NET Aspire" to **Aspire**, now a polyglot
orchestration platform. Relevant capabilities:

- One-command local stack via the `aspire` CLI (`curl -sSL https://aspire.dev/install.sh | bash`, then
  `aspire run`) — boots every resource and opens a dashboard with live logs/traces/health and clickable
  URLs. No Visual Studio required (good for Mac/cross-platform).
- Postgres as a managed resource: `AddPostgres(...).WithDataVolume()` runs Postgres in a container with a
  persistent volume and injects the connection string into the API.
- Frontend integration: `AddNpmApp` is deprecated; current API is `AddJavaScriptApp` (auto package-manager
  detection) and `AddViteApp` (first-class Vite + HMR). `.WithNpm(install: true)` /
  `.WithNpmPackageInstallation()` runs `npm install`; `.WithReference(api)` injects the backend URL;
  `.WithExternalHttpEndpoints()` surfaces a resource in the dashboard.
- Requirement: a container runtime (Docker Desktop or Podman) on each dev machine.

Sources: [Aspire 13 announcement](https://devblogs.microsoft.com/aspire/aspire13/),
[Full-stack React + Aspire (.NET blog)](https://devblogs.microsoft.com/dotnet/new-aspire-app-with-react/),
[Aspire in .NET 10 overview](https://codewithmukesh.com/blog/aspire-for-dotnet-developers-deep-dive/),
[Aspire benefits 2026 (Belitsoft)](https://belitsoft.com/net-development-services/net-aspire).

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Frontend ↔ Aspire relationship | **Hybrid** — Aspire orchestrates the frontend too (one command runs DB+API+React), and the React app also runs standalone via `npm run dev` against the Aspire-hosted API. |
| 2 | Frontend scope this session | **Minimal working Vite app** — a real but tiny Vite + React 19 + TS app proving the wiring; the separate team builds the real pages/design system. |
| 3 | Backend integration depth | **Full integration** — ServiceDefaults project + Aspire Npgsql EF client integration (OTel, health checks, resilience). |
| 4a | AppHost placement | Under `src/backend/` in the existing `LeaveCalendar.sln`. |
| 4b | DB admin UI | pgweb/pgAdmin sidecar on the Postgres resource. |
| 4c | Frontend ↔ backend comms | Vite dev-server proxy (`/api/*`), same-origin in both modes → no CORS needed. |
| 4d | Minimal FE page behaviour | Exercises `GET /health` and `GET /leave-types` to prove the round-trip. |

## Goal & success criteria

A new contributor — backend **or** frontend — clones the repo and runs one command (`aspire run`) to get
Postgres + API + React up, with a dashboard, no manual Postgres install and no hand-managed connection
strings/ports. Frontend-only devs can alternatively run just `npm run dev` against the Aspire-hosted API.

**Done =** `aspire run` opens the dashboard, the API is healthy with migrations + seed applied, and the
React page successfully round-trips to the API.

## Solution structure

Two new .NET projects added to the existing `src/backend/LeaveCalendar.sln`:

- **`LeaveCalendar.AppHost`** — orchestration root (Aspire 13 SDK). References `LeaveCalendar.Web` via
  `Projects.*`; declares Postgres, the API, and the Vite frontend.
- **`LeaveCalendar.ServiceDefaults`** — shared Aspire conventions (OpenTelemetry, health endpoints,
  service discovery, resilience). Referenced by `LeaveCalendar.Web`.

```
src/
  backend/
    LeaveCalendar.AppHost/          (new) orchestration root
    LeaveCalendar.ServiceDefaults/  (new) OTel / health / discovery
    LeaveCalendar.Web/              + AddServiceDefaults(), Aspire Npgsql EF client
    LeaveCalendar.Domain/ , *Tests/ (unchanged)
  frontend/                         minimal Vite + React 19 + TS app (new build files)
```

AppHost + ServiceDefaults live under `src/backend/` (the only .NET solution; ServiceDefaults is consumed
by the API; AppHost needs a same-solution project reference to the API). The frontend is referenced by
**path**, not as a .NET project.

## AppHost resource graph

```
postgres (container, WithDataVolume, + pgweb/pgAdmin sidecar)
  └─ leavecalendar (database)
       └─ api  (LeaveCalendar.Web) — WithReference(db), WaitFor(db),
       │        WithExternalHttpEndpoints, health check "/health"
       └─ web  (AddViteApp)        — WithReference(api), WaitFor(api),
                WithNpm(install:true), WithExternalHttpEndpoints
```

Postgres gets a persistent data volume so seeded data survives restarts; an optional pgweb/pgAdmin sidecar
lets you browse the DB from the dashboard. `WaitFor` enforces ordering: DB → API (migrate+seed) → frontend.

## Backend changes (full integration)

- New **ServiceDefaults**: `AddServiceDefaults()` wires OTel (traces/metrics/logs → dashboard via OTLP),
  `/health` + `/alive`, service discovery, standard resilience handlers.
- **`LeaveCalendar.Web`**:
  - Call `builder.AddServiceDefaults()`.
  - Swap the manual Npgsql DbContext registration for Aspire client integration
    `builder.AddNpgsqlDbContext<LeaveDbContext>("leavecalendar")`
    (`Aspire.Npgsql.EntityFrameworkCore.PostgreSQL`) — pooling, retries, health checks, EF telemetry.
    Connection string arrives by resource name.
  - Keep migrate + seed on startup.
  - Add `app.MapDefaultEndpoints()`; keep existing `/health`.
- **`appsettings.Development.json`**: the hardcoded `ConnectionStrings:Default` becomes a fallback for
  running the API standalone; Aspire's injected connection wins when present. JWT/Serilog untouched.
- **Subtlety:** `AddLeaveCalendar()` currently builds the DbContext from `ConnectionStrings:Default`.
  Refactor it to consume the Aspire connection (`leavecalendar`) while keeping the fallback, so
  `dotnet run` still works outside Aspire.

## Frontend (minimal Vite app) + comms

- Scaffold **Vite + React 19 + TypeScript** at `src/frontend/`: one page that exercises the backend
  (`GET /health` + `GET /leave-types`) to prove wiring, with `data-test` attributes per the frontend
  README conventions. **No** SCSS-modules / design-system build-out — that is the frontend team's.
- **Comms: Vite dev-server proxy** (`/api/*` → backend). Under Aspire the proxy target is the injected
  service-discovery variable (`services__api__https__0 || services__api__http__0`); standalone it falls
  back to a `.env` default. Same-origin in both modes → no CORS needed; the existing "Spa" CORS policy
  stays as a safety net.
- `WithNpm(install: true)` runs `npm install` on first `aspire run`.

## Onboarding & docs

README gets: prerequisites (Docker/Podman, Aspire CLI one-liner, .NET 10 SDK, Node LTS), the `aspire run`
quickstart, and both frontend workflows (full-stack via Aspire; FE-only via `npm run dev`). Update
`src/frontend/README.md` and the root repo-layout section. The container-runtime requirement is called
out prominently.

## Error handling / failure modes

`WaitFor` + `WithHttpHealthCheck("/health")` keep the frontend from hitting a not-yet-migrated API; the
dashboard shows resource health and surfaces migration/seed failures in logs/traces. Docker-not-running →
`aspire run` fails fast (documented in troubleshooting).

## Testing

Unit + integration tests stay **unchanged** — integration tests keep their own Testcontainers Postgres,
independent of Aspire. No `Aspire.Hosting.Testing` (YAGNI). Verification is manual for this spec:
`aspire run`, then confirm dashboard + health + seed + React↔API round-trip.

## Out of scope (YAGNI)

- Production deployment / `aspire publish` / `aspire do` pipelines / k8s manifests (`infra/` stays stubbed).
- The full frontend feature build (frontend team).
- Aspire-based integration testing.
