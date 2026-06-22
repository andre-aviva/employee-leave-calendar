# employee-leave-calendar E2E tests

Cypress E2E suite for the Employee Leave Calendar front end, structured as a
Page-Object-Model (POM) suite per `.claude/skills/cypress-e2e-pom/SKILL.md`.

This is currently a single-variant project: shared building blocks (page objects,
helpers, test data, types) live under `cypress/support/` so they can be split into a
dedicated shared package later if a second variant (tenant/brand/locale) is added.

## Setup

```bash
pnpm install
cp cypress.env.json.example cypress.env.json
```

Fill in `cypress.env.json` with local credentials. The example file contains the
default DbSeeder values for Development environments — no changes needed when running
against a locally seeded database:

```json
{
  "EMPLOYEE_USERNAME": "employee",
  "EMPLOYEE_PASSWORD": "Employee!123",
  "ADMIN_USERNAME": "admin",
  "ADMIN_PASSWORD": "Admin!123"
}
```

This file is gitignored. The backend must be started with `DbSeeder__IncludeDemoUsers=true`
(the default in Development and the integration-test harness) — without it the test
users (Alice, Eddie, Nora) are not seeded and all specs will fail at sign-in.

`cypress.config.ts` points `baseUrl` at `http://localhost:3000`, matching the Vite
dev server default.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm open` / `pnpm open:e2e` | Open the Cypress runner |
| `pnpm headless` / `pnpm headless:e2e` | Run specs headlessly |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm check` | Lint + typecheck |

## Structure

```
cypress/
  e2e/
    a11y/             # accessibility spec (cypress-axe, WCAG 2.2 AA)
    calendar/         # Calendar Overview spec
    leave-management/ # Leave Management spec (Admin only)
    my-leave/         # My Leave spec
    navigation/       # Navigation Bar spec
    security/         # security smoke spec
    sign-in/          # Sign In spec
  fixtures/           # JSON fixtures (form data, etc.)
  reports/            # generated reports (gitignored)
    a11y/             # axe-html-reporter HTML output (written on a11y failures)
  support/
    commands.ts       # custom Cypress commands
    constants.ts      # shared enums (TEXTS, etc.) and regexes
    e2e.ts            # global setup: log collector, real-events, cypress-axe, uncaught exceptions
    helpers/
      a11y.ts         # logA11yViolations — formats axe violations to cy.log + generates HTML report
      api.ts          # cy.request helpers for API-level test data setup/teardown
      dates.ts        # isoDate() / displayDate() date utilities
      element.ts      # element() / elementStartsWith() / elementEndsWith() selector builders
    pages/            # Page Object classes (static-only classes)
    testdata/         # typed fixtures describing pages/entities
    types/            # shared TypeScript types
```

## Conventions

- Select elements via `data-test` attributes only, using the `element()` /
  `elementStartsWith()` / `elementEndsWith()` helpers in `cypress/support/helpers/element.ts`.
- Page objects are classes with only `static` members (see skill section 4 for method
  naming conventions: `visit*`, `get*`, `check*`, `click*`, `set*`/`fill*`, `setup*`,
  `waitFor*`).
- Centralize `cy.intercept(...).as(...)` registrations in one `setupInterceptions()`
  method, called from a shared sign-in/setup helper.

### Known gotcha

Errors thrown in `before()`/`beforeEach()` (e.g. `Failed to fetch` from a previous
test's in-flight requests being cancelled) can fail the *next* test. Fix this by
waiting for in-flight requests to settle inside the test itself (e.g.
`cy.wait(['@getSomething'])`) rather than suppressing the resulting exception.
