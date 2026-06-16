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

Fill in `cypress.env.json` with local credentials (`TARGET_USERNAME` /
`TARGET_PASSWORD`). This file is gitignored.

`cypress.config.ts` points `baseUrl` at `http://localhost:3000` — update this once
the front end's dev server port is known.

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
  e2e/                # spec files, organized by feature area (see skill section 19)
  fixtures/           # JSON fixtures (form data, etc.)
  support/
    commands.ts       # custom Cypress commands
    constants.ts      # shared enums (TEXTS, etc.) and regexes
    e2e.ts            # global setup: log collector, real-events, uncaught exceptions
    helpers/          # element() selector helpers + other shared utilities
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
