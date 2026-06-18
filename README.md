# employee-leave-calendar

A team availability tool where employees register and manage their own leave and everyone gets a clear view of who is absent on any given day.

This repository is a monorepo holding the backend, frontend, end-to-end tests, and infrastructure for the Employee Leave Calendar. The shared architecture is documented in Confluence: System Architecture (arc42) and the Backend Architecture deep-dive.

## Repository layout

```
.
├── src/
│   ├── backend/        .NET 10 Web API (Vertical Slice + Screaming, EF Core, PostgreSQL)
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

## Conventions

Wire-format dates are ISO YYYY-MM-DD; the UI displays DD-MM-YYYY. "Today" is computed in Europe/Amsterdam. Business-rule violations return RFC 9457 ProblemDetails with stable 422 codes (OVERLAP, TYPE_NOT_REGISTERABLE, START_DATE_IN_PAST). See each subfolder README for area-specific conventions.

This is a structure-only scaffold: folders carry README and .gitkeep placeholders, with no build files yet.
