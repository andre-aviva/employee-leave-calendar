# Aspire Local Development Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Orchestrate the full local stack (PostgreSQL + API + React) with Aspire so a new contributor runs one command (`aspire run`) and gets everything up, with no manual PostgreSQL install or hand-managed connection strings.

**Architecture:** Add two .NET projects to the existing solution — `LeaveCalendar.AppHost` (Aspire orchestration root) and `LeaveCalendar.ServiceDefaults` (OpenTelemetry / health / service discovery). The API consumes its Postgres connection through Aspire's Npgsql EF client integration. A minimal Vite + React + TS app proves the wiring and is orchestrated by the AppHost, while also runnable standalone via `npm run dev` (Vite proxies `/api` and `/health` to the backend using Aspire-injected service-discovery variables).

**Tech Stack:** .NET 10, Aspire 13, EF Core 10 + Npgsql, PostgreSQL (container), React 19 + TypeScript + Vite, CommunityToolkit Node.js hosting.

## Global Constraints

- Target framework for all new .NET projects: **`net10.0`**.
- Aspire packages must be **13.x** (the major matching .NET 10). After adding any Aspire package, run `dotnet list package` and confirm it resolved to 13.x; **pin explicitly** if NuGet picked a different major. (Do not assume "latest" is compatible — verify.)
- Postgres connection name is **`leavecalendar`** everywhere (AppHost database resource, `AddNpgsqlDbContext`, `appsettings`, test config).
- Do **not** call `MapDefaultEndpoints()` — keep the existing custom `app.MapGet("/health", …)` (it is anonymous and works in every environment, including `IntegrationTest`, which `HealthTests` relies on; ServiceDefaults' health mapping is Development-only and would duplicate the `/health` route).
- Frontend code follows `src/frontend/README.md`: **named exports + function declarations only** (no default exports), and every interactive/content element carries a `data-test="[Component]_[Element]"` attribute.
- A container runtime (Docker Desktop or Podman) must be running for `aspire run` and for the integration tests (Testcontainers).
- Conventional Commits; commit after each task.

## Sequencing & branching

- This plan assumes PR #16 (`docs/aspire-local-development-spec`, which added the README **Local development** section + the design spec) is **merged to `main` first**. Task 6 edits that README section.
- Do the work on a new branch off an up-to-date `main`: `feat/aspire-local-development`. Follow `.claude/skills/git-workflow/SKILL.md`.

## Prerequisites (one-time, no commit)

- [ ] Install the Aspire CLI: `curl -sSL https://aspire.dev/install.sh | bash`, then verify: `aspire --version` (expect 13.x).
- [ ] Ensure the Aspire project templates are available: `dotnet new list aspire` should list `aspire-apphost` and `aspire-servicedefaults`. If missing: `dotnet new install Aspire.ProjectTemplates`.
- [ ] Ensure Docker Desktop (or Podman) is running: `docker info` returns without error.
- [ ] Create the branch:

```bash
git checkout main && git pull --ff-only origin main
git checkout -b feat/aspire-local-development
```

## File structure

**Create:**
- `src/backend/LeaveCalendar.ServiceDefaults/LeaveCalendar.ServiceDefaults.csproj` + `Extensions.cs` (from template) — OTel/health/discovery conventions.
- `src/backend/LeaveCalendar.AppHost/LeaveCalendar.AppHost.csproj` + `AppHost.cs` — resource graph (Postgres, API, Vite app).
- `src/frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.env`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts` — minimal Vite app.

**Modify:**
- `src/backend/LeaveCalendar.Web/LeaveCalendar.Web.csproj` — reference ServiceDefaults + add Aspire Npgsql EF package.
- `src/backend/LeaveCalendar.Web/Program.cs` — `AddServiceDefaults()`.
- `src/backend/LeaveCalendar.Web/Infrastructure/DependencyInjection.cs` — swap `AddDbContext` → `AddNpgsqlDbContext("leavecalendar")`.
- `src/backend/LeaveCalendar.Web/appsettings.Development.json` — rename connection string key to `leavecalendar`.
- `src/backend/LeaveCalendar.IntegrationTests/Infrastructure/ApiFactory.cs` — rename injected connection-string key to `leavecalendar`.
- `src/backend/LeaveCalendar.sln` — add the two new projects.
- `README.md`, `src/frontend/README.md` — finalize onboarding docs.

---

### Task 1: Aspire ServiceDefaults + API telemetry wiring

**Files:**
- Create: `src/backend/LeaveCalendar.ServiceDefaults/LeaveCalendar.ServiceDefaults.csproj`, `src/backend/LeaveCalendar.ServiceDefaults/Extensions.cs`
- Modify: `src/backend/LeaveCalendar.Web/LeaveCalendar.Web.csproj`, `src/backend/LeaveCalendar.Web/Program.cs`, `src/backend/LeaveCalendar.sln`
- Test (regression): `src/backend/LeaveCalendar.IntegrationTests`

**Interfaces:**
- Produces: `Microsoft.Extensions.Hosting.Extensions.AddServiceDefaults(this IHostApplicationBuilder)` (from the generated ServiceDefaults project) — consumed by Program.cs here and conceptually available to any host.

- [ ] **Step 1: Scaffold the ServiceDefaults project from the template (pins compatible versions)**

```bash
cd src/backend
dotnet new aspire-servicedefaults -n LeaveCalendar.ServiceDefaults -o LeaveCalendar.ServiceDefaults --framework net10.0
```

This generates `Extensions.cs` (standard OpenTelemetry + health-checks + service-discovery + HTTP resilience conventions) and a csproj with matching-version package references. Do not edit `Extensions.cs`.

- [ ] **Step 2: Confirm Aspire package versions resolved to 13.x**

Run: `dotnet list LeaveCalendar.ServiceDefaults/LeaveCalendar.ServiceDefaults.csproj package`
Expected: `Microsoft.Extensions.ServiceDiscovery`, `OpenTelemetry.*` and any `Aspire.*` packages show a 13.x (or the template's matching) version. If a major mismatch appears, pin to 13.x and re-run.

- [ ] **Step 3: Add the project to the solution**

```bash
dotnet sln LeaveCalendar.sln add LeaveCalendar.ServiceDefaults/LeaveCalendar.ServiceDefaults.csproj
```

- [ ] **Step 4: Reference ServiceDefaults from the Web project**

```bash
dotnet add LeaveCalendar.Web/LeaveCalendar.Web.csproj reference LeaveCalendar.ServiceDefaults/LeaveCalendar.ServiceDefaults.csproj
```

- [ ] **Step 5: Call `AddServiceDefaults()` in Program.cs**

In `src/backend/LeaveCalendar.Web/Program.cs`, add `builder.AddServiceDefaults();` immediately after the Serilog line. Add the using if the IDE flags it (the template puts the extension in `Microsoft.Extensions.Hosting`, usually covered by ImplicitUsings).

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration).Enrich.FromLogContext());
builder.AddServiceDefaults();
builder.AddLeaveCalendar();
```

> Do **not** add `app.MapDefaultEndpoints()` — see Global Constraints (keeps the existing `/health` working in the `IntegrationTest` environment and avoids a duplicate route). OpenTelemetry traces/metrics, service discovery, and resilience all come from `AddServiceDefaults()` at the builder phase; Serilog remains the logging provider and its console output is captured by the Aspire dashboard.

- [ ] **Step 6: Build and run the full test suite (regression — nothing should break)**

Run: `dotnet build LeaveCalendar.sln` then `dotnet test LeaveCalendar.sln`
Expected: build succeeds; all unit + integration tests PASS (requires Docker for Testcontainers).

- [ ] **Step 7: Commit**

```bash
git add src/backend/LeaveCalendar.ServiceDefaults src/backend/LeaveCalendar.Web/Program.cs src/backend/LeaveCalendar.Web/LeaveCalendar.Web.csproj src/backend/LeaveCalendar.sln
git commit -m "feat(aspire): add ServiceDefaults and wire telemetry into the API"
```

---

### Task 2: Consume the Aspire-provided Postgres connection

Switch the API's DbContext registration to Aspire's Npgsql EF client integration and standardize the connection name to `leavecalendar`. The integration-test harness and the standalone `appsettings` fallback are updated to match.

**Files:**
- Modify: `src/backend/LeaveCalendar.Web/LeaveCalendar.Web.csproj`, `src/backend/LeaveCalendar.Web/Infrastructure/DependencyInjection.cs`, `src/backend/LeaveCalendar.Web/appsettings.Development.json`, `src/backend/LeaveCalendar.IntegrationTests/Infrastructure/ApiFactory.cs`
- Test (regression): `src/backend/LeaveCalendar.IntegrationTests`

**Interfaces:**
- Consumes: nothing new.
- Produces: the API resolves `LeaveDbContext` from connection name **`leavecalendar`** (Aspire-injected at runtime, `appsettings`/test-config as fallback). Task 3's AppHost must expose a database resource named `leavecalendar`.

- [ ] **Step 1: Add the Aspire Npgsql EF client package**

```bash
cd src/backend
dotnet add LeaveCalendar.Web/LeaveCalendar.Web.csproj package Aspire.Npgsql.EntityFrameworkCore.PostgreSQL
dotnet list LeaveCalendar.Web/LeaveCalendar.Web.csproj package
```
Expected: the package resolves to **13.x**. If not, re-add with `--version 13.*` and confirm.

- [ ] **Step 2: Swap the DbContext registration**

In `src/backend/LeaveCalendar.Web/Infrastructure/DependencyInjection.cs`, replace:

```csharp
        var services = builder.Services;
        services.AddDbContext<LeaveDbContext>(o =>
            o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
```

with:

```csharp
        var services = builder.Services;
        builder.AddNpgsqlDbContext<LeaveDbContext>("leavecalendar");
```

Remove the now-unused `using Microsoft.EntityFrameworkCore;` only if the compiler flags it as unused (other code in the file may still need it — leave it if so).

- [ ] **Step 3: Rename the standalone fallback connection string**

In `src/backend/LeaveCalendar.Web/appsettings.Development.json`, rename the key under `ConnectionStrings` from `Default` to `leavecalendar` (value unchanged):

```json
  "ConnectionStrings": {
    "leavecalendar": "Host=localhost;Port=5432;Database=leavecalendar;Username=postgres;Password=postgres"
  },
```

- [ ] **Step 4: Update the integration-test connection key**

In `src/backend/LeaveCalendar.IntegrationTests/Infrastructure/ApiFactory.cs`, change the injected key from `ConnectionStrings:Default` to `ConnectionStrings:leavecalendar`:

```csharp
            ["ConnectionStrings:leavecalendar"] = _db.GetConnectionString(),
```

- [ ] **Step 5: Run the full test suite (proves the DbContext resolves the renamed connection)**

Run: `dotnet test LeaveCalendar.sln`
Expected: all tests PASS. (If any test fails with an execution-strategy/transaction error from `ResetAsync`'s raw `TRUNCATE`, disable retry: change Step 2 to `builder.AddNpgsqlDbContext<LeaveDbContext>("leavecalendar", settings => settings.DisableRetry = true);` and re-run.)

- [ ] **Step 6: Commit**

```bash
git add src/backend/LeaveCalendar.Web src/backend/LeaveCalendar.IntegrationTests/Infrastructure/ApiFactory.cs
git commit -m "refactor(persistence): resolve DbContext via Aspire Npgsql integration"
```

---

### Task 3: AppHost orchestrating Postgres + the API

**Files:**
- Create: `src/backend/LeaveCalendar.AppHost/LeaveCalendar.AppHost.csproj`, `src/backend/LeaveCalendar.AppHost/AppHost.cs`
- Modify: `src/backend/LeaveCalendar.sln`

**Interfaces:**
- Consumes: the API resolves connection name `leavecalendar` (Task 2).
- Produces: a runnable AppHost with resources `postgres`, database `leavecalendar`, and project `api`. Task 5 adds a `web` Vite resource to `AppHost.cs`.

- [ ] **Step 1: Scaffold the AppHost from the template**

```bash
cd src/backend
dotnet new aspire-apphost -n LeaveCalendar.AppHost -o LeaveCalendar.AppHost --framework net10.0
dotnet sln LeaveCalendar.sln add LeaveCalendar.AppHost/LeaveCalendar.AppHost.csproj
```

- [ ] **Step 2: Add the PostgreSQL hosting integration and reference the API project**

```bash
cd LeaveCalendar.AppHost
dotnet add package Aspire.Hosting.PostgreSQL
dotnet add reference ../LeaveCalendar.Web/LeaveCalendar.Web.csproj
dotnet list package
```
Expected: `Aspire.Hosting.AppHost` and `Aspire.Hosting.PostgreSQL` are 13.x. Pin if needed.

- [ ] **Step 3: Write the AppHost resource graph**

Replace the contents of `src/backend/LeaveCalendar.AppHost/AppHost.cs` with:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()   // persistent volume so seeded data survives restarts
    .WithPgWeb();       // browse the DB from the dashboard

var leavecalendar = postgres.AddDatabase("leavecalendar");

builder.AddProject<Projects.LeaveCalendar_Web>("api")
    .WithReference(leavecalendar)
    .WaitFor(leavecalendar)
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health");

builder.Build().Run();
```

> `Projects.LeaveCalendar_Web` is generated by the Aspire SDK from the project reference added in Step 2 (note the underscore). If it does not resolve, run `dotnet build` once to trigger generation.

- [ ] **Step 4: Build the AppHost**

Run: `dotnet build LeaveCalendar.AppHost/LeaveCalendar.AppHost.csproj`
Expected: build succeeds (confirms `Projects.LeaveCalendar_Web` resolved).

- [ ] **Step 5: Run the stack and verify the API comes up healthy with seeded data**

```bash
cd src/backend/LeaveCalendar.AppHost
aspire run
```

In the dashboard that opens: `postgres` and `pgweb` are Running, `api` is Running and **Healthy**. Then verify the API and seed (copy the `api` HTTPS URL from the dashboard, shown here as `<api>`):

```bash
curl -k <api>/health
# Expected: {"status":"healthy"}
curl -k -s -X POST <api>/api/auth/sign-in -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin!123"}'
# Expected: 200 with a token in the body (proves migrations + seed ran against the Aspire Postgres)
```

Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add src/backend/LeaveCalendar.AppHost src/backend/LeaveCalendar.sln
git commit -m "feat(aspire): add AppHost orchestrating Postgres and the API"
```

---

### Task 4: Minimal Vite + React + TypeScript app

**Files:**
- Create: `src/frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.env`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts` (existing `README.md` and scaffold folders are preserved).

**Interfaces:**
- Produces: a Vite app at `src/frontend` whose dev server proxies `/api` and `/health` to a backend target derived from Aspire service-discovery env vars (or `.env` fallback). Task 5 references it from the AppHost.

- [ ] **Step 1: Scaffold a known-good React-TS template into a temp dir (for template-pinned versions)**

```bash
npm create vite@latest /tmp/elc-vite -- --template react-ts
```

This yields a `package.json` with current, mutually-compatible React 19 + TypeScript + Vite versions.

- [ ] **Step 2: Copy the version-bearing/template files into `src/frontend` (do NOT overwrite the existing README.md)**

```bash
cd /Users/saber/dev/employee-leave-calendar/src/frontend
cp /tmp/elc-vite/package.json /tmp/elc-vite/tsconfig.json /tmp/elc-vite/tsconfig.node.json ./
cp /tmp/elc-vite/index.html ./
cp /tmp/elc-vite/.gitignore ./
cp /tmp/elc-vite/src/vite-env.d.ts ./src/
```

Confirm `package.json` lists `react` and `react-dom` at `^19`.

- [ ] **Step 3: Write `vite.config.ts` with the dual-mode proxy**

Create/overwrite `src/frontend/vite.config.ts`:

```ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Backend target: Aspire injects service-discovery vars under `aspire run`;
// falls back to VITE_API_URL (.env) when the frontend runs standalone.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target =
    process.env.services__api__https__0 ||
    process.env.services__api__http__0 ||
    env.VITE_API_URL ||
    'https://localhost:7000'

  const proxy = {
    '/api': { target, changeOrigin: true, secure: false },
    '/health': { target, changeOrigin: true, secure: false },
  }

  return {
    plugins: [react()],
    server: { proxy },
  }
})
```

> No path rewrite: backend feature routes already live under `/api` and `/health` is at the root.

- [ ] **Step 4: Write the entry point and the minimal page**

Overwrite `src/frontend/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Overwrite `src/frontend/src/App.tsx` (named export + `data-test` per the frontend README):

```tsx
import { useEffect, useState } from 'react'

export function App() {
  const [health, setHealth] = useState('checking…')
  const [leaveTypes, setLeaveTypes] = useState('checking…')

  useEffect(() => {
    fetch('/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body: { status: string }) => setHealth(`healthy (${body.status})`))
      .catch((e) => setHealth(`unreachable (${e})`))

    // /api/leave-types requires auth; a 401 still proves the /api proxy reaches the backend.
    fetch('/api/leave-types')
      .then((r) =>
        setLeaveTypes(
          r.status === 401 ? 'reachable (401 — sign-in required)' : `reachable (${r.status})`,
        ),
      )
      .catch((e) => setLeaveTypes(`unreachable (${e})`))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', lineHeight: 1.6 }}>
      <h1>Employee Leave Calendar</h1>
      <p data-test="App_HealthStatus">API health: {health}</p>
      <p data-test="App_LeaveTypesStatus">Leave-types endpoint: {leaveTypes}</p>
      <p>
        Minimal wiring check. The full UI is built by the frontend team — see{' '}
        <code>src/frontend/README.md</code>.
      </p>
    </main>
  )
}
```

- [ ] **Step 5: Remove the no-longer-needed `src/App.*` template leftovers and add `.env`**

Delete any `App.css`, `index.css`, `assets/` the template copied if present (we kept the copy list minimal, so usually nothing to delete). Create `src/frontend/.env`:

```
# Used only when running the frontend standalone (`npm run dev` without `aspire run`).
# Point this at your locally running API; under `aspire run` it is ignored.
VITE_API_URL=https://localhost:7000
```

- [ ] **Step 6: Install and build to verify the app compiles**

```bash
cd src/frontend
npm install
npm run build
```
Expected: `tsc` + Vite build succeed with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/frontend
git commit -m "feat(frontend): scaffold minimal Vite React app for wiring checks"
```

---

### Task 5: Orchestrate the Vite frontend in the AppHost

**Files:**
- Modify: `src/backend/LeaveCalendar.AppHost/LeaveCalendar.AppHost.csproj`, `src/backend/LeaveCalendar.AppHost/AppHost.cs`

**Interfaces:**
- Consumes: the API resource `api` (Task 3) and the Vite app at `src/frontend` (Task 4).

- [ ] **Step 1: Add the CommunityToolkit Node.js hosting integration**

```bash
cd src/backend/LeaveCalendar.AppHost
dotnet add package CommunityToolkit.Aspire.Hosting.NodeJS.Extensions
dotnet list package
```
Expected: the package resolves to a 13.x-compatible version.

- [ ] **Step 2: Add the Vite resource to the AppHost graph**

In `src/backend/LeaveCalendar.AppHost/AppHost.cs`, capture the `api` resource in a variable and add the `web` resource. The file becomes:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()
    .WithPgWeb();

var leavecalendar = postgres.AddDatabase("leavecalendar");

var api = builder.AddProject<Projects.LeaveCalendar_Web>("api")
    .WithReference(leavecalendar)
    .WaitFor(leavecalendar)
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health");

builder.AddViteApp("web", "../../frontend")
    .WithReference(api)              // injects services__api__http(s)__0 into the Vite process
    .WaitFor(api)
    .WithNpmPackageInstallation()   // runs `npm install` if node_modules is missing
    .WithExternalHttpEndpoints();

builder.Build().Run();
```

- [ ] **Step 3: Run the full stack and verify the frontend round-trips through the proxy**

```bash
cd src/backend/LeaveCalendar.AppHost
aspire run
```

In the dashboard: `postgres`, `pgweb`, `api` (Healthy), and `web` are all Running. Open the `web` external URL from the dashboard. The page shows:

- `API health: healthy (healthy)`
- `Leave-types endpoint: reachable (401 — sign-in required)`

Both lines proving the Vite dev server proxied `/health` and `/api/*` to the API via Aspire service discovery. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/backend/LeaveCalendar.AppHost
git commit -m "feat(aspire): orchestrate the Vite frontend in the AppHost"
```

---

### Task 6: Finalize onboarding docs

**Files:**
- Modify: `README.md`, `src/frontend/README.md`

**Interfaces:** none.

- [ ] **Step 1: Remove the "target workflow" caveat from the README Local development section**

In `README.md`, delete the blockquote that begins `> The Aspire orchestration described here is being wired up …` (the workflow is now real).

- [ ] **Step 2: Add seeded dev credentials to the README Local development section**

After the "Run the whole stack" paragraph in `README.md`, add:

```markdown
Seeded sign-in credentials (via `POST /api/auth/sign-in` with `{ "username", "password" }`):

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `Admin!123` | Admin |
| `employee` | `Employee!123` | Employee |
| `nora` | `Employee!123` | Employee |
```

- [ ] **Step 3: Update the repository-layout block and fix the stale scaffold line**

In `README.md` repository layout, add the two new backend projects under `src/backend/`:

```
│   │   ├── LeaveCalendar.AppHost/           Aspire orchestration root (run `aspire run` here)
│   │   ├── LeaveCalendar.ServiceDefaults/   OpenTelemetry / health / service discovery
```

Replace the final line `This is a structure-only scaffold: folders carry README and .gitkeep placeholders, with no build files yet.` with:

```markdown
The backend is fully implemented and the local stack runs end-to-end via Aspire (see **Local development**). The frontend currently holds a minimal wiring-check app; the full UI is built by a separate team per `src/frontend/README.md`.
```

- [ ] **Step 4: Note the minimal app in the frontend README**

Append to `src/frontend/README.md`:

```markdown
## Current state

`src/App.tsx` is a minimal wiring-check page (verifies the API is reachable through the Vite proxy). Build the real pages/components per the conventions above; replace `App.tsx` as the app grows.

Run standalone (against a running API): `npm install && npm run dev`. Under `aspire run` the backend URL is injected automatically; standalone, set `VITE_API_URL` in `.env`.
```

- [ ] **Step 5: Verify docs render and links resolve**

Run: `grep -n "being wired up" README.md` → expect no matches. Visually confirm the Local development section reads correctly and the layout lists the new projects.

- [ ] **Step 6: Commit**

```bash
git add README.md src/frontend/README.md
git commit -m "docs: finalize Aspire local-dev onboarding"
```

---

## Final verification (whole-plan)

- [ ] `dotnet test src/backend/LeaveCalendar.sln` — all green.
- [ ] `cd src/backend/LeaveCalendar.AppHost && aspire run` — dashboard shows `postgres`, `pgweb`, `api` (Healthy), `web` all Running; the `web` page shows API healthy + leave-types reachable.
- [ ] `cd src/frontend && npm run dev` (standalone, with `VITE_API_URL` pointing at a running API) — page loads; proxy reaches the backend.
- [ ] Open a PR with `gh` against `main` (do **not** merge — the maintainer merges).

## Self-review notes (author)

- **Spec coverage:** Hybrid FE (Tasks 4–5 + standalone `.env` path) ✓; minimal Vite app (Task 4) ✓; full backend integration — ServiceDefaults (Task 1) + Npgsql client integration (Task 2) ✓; Postgres data volume + pgweb (Task 3) ✓; Vite proxy / no-CORS (Task 4) ✓; onboarding docs (Task 6) ✓; tests stay on Testcontainers (Tasks 1–2 only adjust a config key, flagged) ✓.
- **Deviation from spec:** the spec said "integration tests unchanged"; in reality one connection-string **key** must change (`Default` → `leavecalendar`) in `ApiFactory.cs` — minimal and called out (Task 2, Step 4). The spec's "minimal page exercises GET /leave-types" is refined: `/leave-types` requires auth, so the page asserts a 401 to prove proxy reachability rather than rendering data.
- **Type/name consistency:** connection name `leavecalendar` is identical across AppHost (`AddDatabase`), API (`AddNpgsqlDbContext`), `appsettings`, and `ApiFactory`. AppHost resource names `api`/`web`/`postgres` match the service-discovery vars used in `vite.config.ts` (`services__api__…`). `Projects.LeaveCalendar_Web` matches the project name.
