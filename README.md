# employee-leave-calendar

A team availability tool where employees register and manage their own leave and everyone gets a clear view of who is absent on any given day.

This repository is a monorepo holding the backend, frontend, end-to-end tests, and infrastructure for the Employee Leave Calendar. The shared architecture is documented in Confluence: System Architecture (arc42) and the Backend Architecture deep-dive.

## Repository layout

```
.
├── src/
│   ├── backend/        .NET 10 Web API (Vertical Slice + Screaming, EF Core, PostgreSQL)
│   │   ├── LeaveCalendar.AppHost/           Aspire orchestration root (`aspire run`)
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

### First-time setup: dev secrets

The JWT signing key is a secret and is **not** committed to source control, so set it once
in [user-secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) before the
first run (loaded automatically in the Development environment):

```bash
dotnet user-secrets set "Jwt:SigningKey" "$(openssl rand -base64 32)" \
  --project src/backend/LeaveCalendar.Web
```

That single key is all `aspire run` needs — Aspire provisions PostgreSQL and injects its
connection string automatically. Only if you run the API **standalone** (outside Aspire,
against your own local PostgreSQL) do you also need a connection string:

```bash
dotnet user-secrets set "ConnectionStrings:leavecalendar" \
  "Host=localhost;Port=5432;Database=leavecalendar;Username=postgres;Password=<your-local-pw>" \
  --project src/backend/LeaveCalendar.Web
```

Without the signing key the API fail-fasts at startup (`Jwt:SigningKey must be supplied …`),
which is the guard that keeps a key from ever shipping empty to production.

### Run the whole stack

From the repository root:

```bash
aspire run
```

`aspire.config.json` (committed at the repo root) points the CLI at the AppHost project, so no `cd` into the project or `--project` flag is needed.

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

## Production admin provisioning

Demo users — including the well-known `admin` / `Admin!123` account — are seeded **only in Development** and in the integration-test harness (`DbSeeder.SeedAsync(…, includeDemoUsers: true)`). A non-Development startup seeds reference data (leave types) but **no users**, so a fresh production deployment never ships a default admin. Provision the initial production admin out of band — for example an idempotent ops step that inserts a single admin from a secret-managed password (hashed via the app's `IPasswordHasher`) and forces a password change on first login. (Production additionally fail-fasts at startup unless `Jwt:SigningKey` is configured.)

## Conventions

Wire-format dates are ISO YYYY-MM-DD; the UI displays DD-MM-YYYY. "Today" is computed in Europe/Amsterdam. Business-rule violations return RFC 9457 ProblemDetails with stable 422 codes (OVERLAP, TYPE_NOT_REGISTERABLE, START_DATE_IN_PAST). See each subfolder README for area-specific conventions.

The backend is fully implemented and the local stack runs end-to-end via Aspire (see **Local development**). The frontend currently holds a minimal wiring-check app; the full UI is built by a separate team per `src/frontend/README.md`.

## Configure MCP in Jetbrain IDE's (Webstorm, Rider)

This setup allows Junie / AI Assistant in WebStorm to access Figma designs through MCP.

### Prerequisites

- WebStorm 2026.1+
- Figma Desktop App
- Dev Mode enabled

### Enable MCP in Figma

1. Open your Figma file in the Desktop App.
2. Enable **Dev Mode**.
3. Enable the **Desktop MCP Server**.

MCP will be available at:

```text
http://127.0.0.1:3845/mcp
```

> Keep the Figma Desktop App running while using MCP.

### Configure in Jetbrain IDE

Navigate to:

```text
Settings → Tools → Junie → Open Junie Settings → Tab: Junie Model Context Protocol (MCP) → Add (+)
```

Add the server:
```
{
    "mcpServers": {
        "Figma": {
            "url": "http://127.0.0.1:3845/mcp"
        }
    }
}
```

Verify the status is **Connected**. After clicking the status icon, you should also see the available Figma MCP Tools ('get_design_context', etc.)

### Test the Connection

In Junie, run:

```text
Use the local Figma Remote MCP via the Figma Desktop App.

What Figma files, pages, and frames are available?
Provide the structure as a tree.
```
