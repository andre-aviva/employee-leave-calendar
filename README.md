# employee-leave-calendar

A team availability tool where employees register and manage their own leave and everyone gets a clear view of who is absent on any given day.

This repository is a monorepo holding the backend, frontend, end-to-end tests, and infrastructure for the Employee Leave Calendar. The shared architecture is documented in Confluence: System Architecture (arc42) and the Backend Architecture deep-dive.

## Repository layout

```
.
├── src/
│   ├── backend/        .NET 10 Web API (Vertical Slice + Screaming, EF Core, PostgreSQL)
│   │   ├── LeaveCalendar.AppHost/           Aspire orchestration root (run `aspire run` here)
│   │   ├── LeaveCalendar.ServiceDefaults/   OpenTelemetry / health / service discovery
│   │   ├── LeaveCalendar.Domain/            entities + invariants (LeaveRules)
│   │   ├── LeaveCalendar.Web/               Features/ slices, Infrastructure/, Common/
│   │   ├── LeaveCalendar.UnitTests/         Domain + handler rules, no DB
│   │   └── LeaveCalendar.IntegrationTests/  endpoints vs PostgreSQL (Testcontainers)
│   └── frontend/       React 19 + TypeScript SPA (React Router, SCSS Modules, fetch)
│       └── src/        components/, pages/, router/, api/, utils/
├── tests/              Cypress + TypeScript E2E suite, Page Object Model (cypress/)
├── infra/              deployment and operations (arc42 section 7, stub)
│   ├── docker/
│   ├── ci/
│   └── k8s/
└── docs/               pointers to the Confluence architecture pages
```

## Stack

| Area | Technology |
| --- | --- |
| Backend | .NET 10 (LTS), ASP.NET Core minimal APIs, EF Core 10, PostgreSQL |
| Frontend | React 19, TypeScript, React Router, SCSS Modules, react-hook-form |
| Tests | xUnit + FluentAssertions (backend), Cypress + TypeScript (E2E) |
| Auth | Stateless JWT, roles (Employee, Admin) in claims |

## Local development

The whole stack — PostgreSQL, the API, and the frontend — is orchestrated with [Aspire](https://aspire.dev). One command boots everything and opens a dashboard with live logs, traces, and health for every resource. There is no manual PostgreSQL install and no connection strings to manage by hand.

### Prerequisites

- A container runtime — **Docker Desktop** or **Podman** (Aspire runs PostgreSQL in a container)
- **.NET 10 SDK**
- **Node.js** (LTS) — for the frontend
- The **Aspire CLI**:
  ```bash
  curl -sSL https://aspire.dev/install.sh | bash
  ```

### Run the whole stack

```bash
cd src/backend/LeaveCalendar.AppHost
aspire run
```

This starts PostgreSQL (with a persistent data volume), runs the API — which applies EF Core migrations and seeds data on startup — installs the frontend's npm dependencies, and starts the Vite dev server. The Aspire dashboard opens automatically with clickable URLs for the API (Swagger), the frontend, and a database browser.

Seeded sign-in credentials (via `POST /api/auth/sign-in` with `{ "username", "password" }`):

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `Admin!123` | Admin |
| `employee` | `Employee!123` | Employee |
| `nora` | `Employee!123` | Employee |

### Frontend-only workflow

Frontend developers who only want to work on the React app can run it on its own against the Aspire-hosted (or any running) API:

```bash
cd src/frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to the backend, so requests are same-origin (no CORS setup needed). Under `aspire run` the backend URL is injected automatically; running standalone, copy `.env.example` to `.env` and set `VITE_API_URL` there.

### Troubleshooting

- **`aspire run` fails immediately** — make sure your container runtime (Docker Desktop / Podman) is running.
- **Port already in use** — stop any standalone PostgreSQL or a previous `aspire run` still holding the ports.
- **`aspire run` hangs at "Starting dashboard…"** — your Aspire CLI is older than the AppHost packages (13.4.5). Update it: `aspire update --self` (interactive) or re-run the install script. (New installs from the script already get a matching version.)

## Conventions

Wire-format dates are ISO YYYY-MM-DD; the UI displays DD-MM-YYYY. "Today" is computed in Europe/Amsterdam. Business-rule violations return RFC 9457 ProblemDetails with stable 422 codes (OVERLAP, TYPE_NOT_REGISTERABLE, START_DATE_IN_PAST). See each subfolder README for area-specific conventions.

The backend is fully implemented and the local stack runs end-to-end via Aspire (see **Local development**). The frontend currently holds a minimal wiring-check app; the full UI is built by a separate team per `src/frontend/README.md`.
