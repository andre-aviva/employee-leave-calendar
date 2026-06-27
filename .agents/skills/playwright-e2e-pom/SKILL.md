---
name: playwright-e2e-pom
description: Use when setting up, extending, or writing tests for a Playwright E2E suite that follows a fixtures-based Page Object Model. Covers package layout, playwright.config.ts conventions, test.extend<> fixtures wiring, instance-based page object classes, data-test selector helpers, typed testdata, async API helpers, race-free waitForResponse patterns, error-state testing with route/unroute, accessibility checks, and scaffolding new specs or page objects.
---

# Playwright E2E — Fixtures-Based Page Object Model

A Playwright E2E suite architecture that separates page interaction logic into instance-based page object classes, wires them into Playwright's fixture system, and enforces race-free network synchronization throughout. Apply this to any project that needs Playwright E2E coverage with a structured, maintainable test suite.

---

## 1. Package layout

The Playwright suite lives in its own isolated package (own `package.json`, `tsconfig.json`, `playwright.config.ts`), separate from application source:

```
playwright/                       # or e2e/, tests-pw/, etc.
  e2e/                            # spec files, one folder per feature area
    sign-in/
      sign-in.spec.ts
    <feature-area>/
      <feature>.spec.ts
    shared/                       # specs for cross-cutting components
      confirmation-dialog.spec.ts
    a11y/
      accessibility.spec.ts
  support/
    constants.ts                  # TEXTS object — all UI copy strings
    fixtures.ts                   # test.extend<PageObjects>() + re-exports test/expect
    helpers/
      a11y.ts                     # checkA11y(page) — WCAG 2.2 AA
      api.ts                      # async API helpers (request, token, ...)
      dates.ts                    # date generation/formatting utilities
      element.ts                  # element(), elementStartsWith(), elementEndsWith()
    pages/
      SignInPage.ts
      NavigationBar.ts
      <FeaturePage>.ts            # one class per page or distinct UI region
    testdata/
      users.ts                    # typed test user constants
      <entities>.ts               # typed test entity constants
    types/
      index.ts                    # shared TypeScript interfaces
  package.json
  playwright.config.ts
  tsconfig.json
  eslint.config.mjs
  .prettierrc.json
```

**Rationale:** keeping the suite isolated means it can be typechecked, linted, and run independently. `support/` holds everything shared across specs; `e2e/` holds only spec files.

---

## 2. `playwright.config.ts` conventions

This architecture supports both serial and parallel execution. Choose based on whether your tests share state.

### Serial execution (shared state, seeded DB, fixed users)

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,    // tests within a file run one at a time
  workers: 1,              // one file at a time globally
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173/',  // trailing slash required
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 10_000,
    navigationTimeout: 60_000,
  },
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }]],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

Use this when tests share a database, use a fixed set of seeded users, or rely on blanket cleanup helpers. It is the safe default.

### Parallel execution (isolated state per test)

```ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,     // all tests run concurrently across workers
  workers: 4,              // tune to CI runner cores and DB connection limit
  retries: 0,
  use: { /* same as above */ },
  // ...
});
```

`fullyParallel: true` is supported but requires every test to be fully self-contained. See section 19 for the rules that apply.

**General points (both modes):**
- Start with Chromium only. Add more entries to `projects` only when cross-browser coverage is explicitly required.
- `baseURL` must end with `/` so `page.goto('/path')` resolves correctly.

---

## 3. Fixtures — the test entry point

`support/fixtures.ts` is the single entry point for all specs. It extends Playwright's base `test` with every page object class and re-exports `test` and `expect`.

**Every spec imports `test` and `expect` exclusively from `../../support/fixtures`.** Never from `@playwright/test` directly in spec files.

```ts
// support/fixtures.ts
import { test as base, expect } from '@playwright/test';
import { SignInPage }     from './pages/SignInPage';
import { NavigationBar }  from './pages/NavigationBar';
import { EntityListPage } from './pages/EntityListPage';
import { EntityForm }     from './pages/EntityForm';
// ... import all page objects

type PageObjects = {
  signInPage: SignInPage;
  navigationBar: NavigationBar;
  entityListPage: EntityListPage;
  entityForm: EntityForm;
  // ... one entry per page object
};

export const test = base.extend<PageObjects>({
  signInPage:     async ({ page }, use) => { await use(new SignInPage(page)); },
  navigationBar:  async ({ page }, use) => { await use(new NavigationBar(page)); },
  entityListPage: async ({ page }, use) => { await use(new EntityListPage(page)); },
  entityForm:     async ({ page }, use) => { await use(new EntityForm(page)); },
  // ...
});

export { expect };
```

**Circular dependency exception:** any helper that calls `expect` but is imported by `fixtures.ts` (directly or transitively) must import `expect` from `@playwright/test` directly, not from `fixtures.ts`. This is the only permitted exception. `support/helpers/a11y.ts` is the canonical example.

---

## 4. Page object conventions

Page objects are **instance-based classes**. They are never instantiated manually in specs — Playwright injects them via fixtures.

```ts
import type { Page } from '@playwright/test';
import { expect }    from '@playwright/test';  // page objects import from @playwright/test
import { element }   from '../helpers/element';

export class EntityListPage {
  constructor(readonly page: Page) {}

  // Locator getters — synchronous, return Locator, never awaited directly
  getTable()               { return this.page.locator(element('EntityList_Table')); }
  getRows()                { return this.page.locator(element('EntityList_Row')); }
  getRow(i: number)        { return this.getRows().nth(i); }
  getEditButton(i: number) { return this.getRows().nth(i).locator(element('EntityList_EditButton')); }
  getEmptyState()          { return this.page.locator(element('EntityList_EmptyState')); }
  getErrorState()          { return this.page.locator(element('EntityList_ErrorState')); }
  getRetryButton()         { return this.page.locator(element('EntityList_RetryButton')); }

  // Action methods — async
  async visit()              { await this.page.goto('/entities'); }
  async clickAdd()           { await this.getAddButton().click(); }
  async clickEdit(i: number) { await this.getEditButton(i).click(); }
  async clickDelete(i: number){ await this.getDeleteButton(i).click(); }

  // Assertion helpers — async, use expect() internally
  async checkEmptyState()           { await expect(this.getEmptyState()).toBeVisible(); }
  async checkErrorState()           { await expect(this.getErrorState()).toBeVisible(); }
  async checkRowCount(n: number)    { await expect(this.getRows()).toHaveCount(n); }
  async checkEditButtonNotExist(i: number) {
    await expect(this.getEditButton(i)).not.toBeAttached();
  }
}
```

### Method naming convention

| Prefix    | Purpose                                                            |
|-----------|--------------------------------------------------------------------|
| `get*`    | Return a `Locator` — synchronous, composable                       |
| `visit()` | Navigate to the page's route — async                               |
| `click*`  | Click an element — async                                           |
| `fill*`   | Fill an input or select an option — async                          |
| `filter*` | Set a filter/search control — async                                |
| `check*`  | Assert state via `expect(...)` — async                             |
| `fill(entity)` | Composite fill accepting a typed data object                  |

### Root locator for dialogs and forms

Expose `get()` returning the container locator. Specs use it to assert visibility and absence:

```ts
export class ConfirmationDialog {
  constructor(private readonly page: Page) {}

  get()               { return this.page.locator(element('ConfirmationDialog')); }
  getTitle()          { return this.get().locator(element('ConfirmationDialog_Title')); }
  getConfirmButton()  { return this.get().locator(element('ConfirmationDialog_ConfirmButton')); }

  async checkVisible()    { await expect(this.get()).toBeVisible(); }
  async checkNotExist()   { await expect(this.get()).not.toBeAttached(); }
  async clickConfirm()    { await this.getConfirmButton().click(); }
  async clickCancel()     { await this.getCancelButton().click(); }
}
```

### Absence assertions

Always use `.not.toBeAttached()` — not `.not.toBeVisible()`, not `.not.toExist()`:

```ts
await expect(this.getEditButton(i)).not.toBeAttached();
await expect(entityForm.get()).not.toBeAttached();
```

### Compound attribute selectors

When an element is identified by both a `data-test` value and a boolean attribute (e.g., `data-today`, `data-active`), use a compound selector string directly rather than `element()`:

```ts
// Boolean attribute — can't use element() here
getTodayCell() {
  return this.page.locator('[data-test="Calendar_DayCell"][data-today]');
}
```

### Badge/variant selectors

When a `data-test` value is derived from a runtime property (e.g., a category name → selector suffix), map it in the page object rather than in the spec:

```ts
getCategoryBadge(rowIndex: number, categoryName: string) {
  const variant = deriveSelectorVariant(categoryName); // e.g. name → 'primary' | 'secondary'
  return this.getRows().nth(rowIndex).locator(element(`Badge_${variant}`));
}
```

---

## 5. Selector strategy: `data-test` attributes

All locators use `data-test` attributes. Three helpers in `support/helpers/element.ts`:

```ts
element('Foo')                   // [data-test="Foo"]
element('Foo', 'h2')             // [data-test="Foo"] h2
element('Foo', element('Bar'))   // [data-test="Foo"] [data-test="Bar"]
elementStartsWith('Badge_')      // [data-test^="Badge_"]
elementEndsWith('Button')        // [data-test$="Button"]
```

Never select by CSS class, inline text alone, or tag name — except for generic semantic elements where no `data-test` exists (e.g., `[role="tooltip"]`, `[role="dialog"]`).

Application components must have matching `data-test="..."` attributes on the elements targeted by page objects.

---

## 6. `waitForResponse` — race-free network synchronization

**Rule:** call `page.waitForResponse()` BEFORE the action that triggers the network request. Assigning the promise after the action creates a race condition where the response may have already fired.

```ts
// ✅ Correct — promise assigned before navigation
const resp = page.waitForResponse('**/api/items');
await entityListPage.visit();
await resp;

// ✅ Correct — encapsulated inside a page object action method
async signIn(username: string, password: string) {
  await this.fillUsername(username);
  await this.fillPassword(password);
  const responsePromise = this.page.waitForResponse('**/api/auth/sign-in');
  await this.submit();
  await responsePromise;
}

// ❌ Wrong — race condition
await entityListPage.visit();
await page.waitForResponse('**/api/items');  // may have already resolved
```

URL pattern guidance:
- Use a glob pattern (`'**/api/items'`) in `beforeEach` to match regardless of origin
- Use an exact path (`'/api/items'`) inside `page.route()` tests — the path must match the intercepted route exactly

---

## 7. Error-state testing: `page.route()` + `page.unroute()`

To test error states and retry behavior, intercept API calls with `page.route()` and restore them with `page.unroute()`:

```ts
test('shows error state when API fails', async ({ page, entityListPage }) => {
  await page.route('/api/items', (route) => route.fulfill({ status: 500 }));
  const errResp = page.waitForResponse('/api/items');
  await entityListPage.visit();
  await errResp;
  await entityListPage.checkErrorState();
});

test('retry button restores data after error', async ({ page, entityListPage }) => {
  await page.route('/api/items', (route) => route.fulfill({ status: 500 }));
  const errResp = page.waitForResponse('/api/items');
  await entityListPage.visit();
  await errResp;
  await page.unroute('/api/items');              // restore before retry
  const okResp = page.waitForResponse('/api/items');
  await entityListPage.getRetryButton().click();
  await okResp;
  await entityListPage.checkEmptyState();
});
```

Always call `page.unroute()` before asserting the recovery state.

---

## 8. API helpers

API helpers are plain async functions in `support/helpers/api.ts`. They take `request: APIRequestContext` as their first argument. Never attach them to a class.

```ts
import type { APIRequestContext } from '@playwright/test';

// Authentication — returns a token
export async function apiSignIn(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const res = await request.post('/api/auth/sign-in', { data: { username, password } });
  return (await res.json()).token;
}

// CRUD for a resource
export async function apiCreateItem(
  request: APIRequestContext,
  token: string,
  body: CreateItemBody,
): Promise<string> {
  const res = await request.post('/api/items', {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  });
  return (await res.json()).id;
}

export async function apiDeleteItem(
  request: APIRequestContext,
  token: string,
  id: string,
): Promise<void> {
  await request.delete(`/api/items/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Cleanup helper — fetch all and delete each
export async function apiCleanupItems(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const res = await request.get('/api/items', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const items: { id: string }[] = await res.json();
  await Promise.all(items.map(({ id }) => apiDeleteItem(request, token, id)));
}

// Paginated endpoints / query string helpers
export async function apiGetAuditTrail(
  request: APIRequestContext,
  token: string,
  qs?: Record<string, string | number | boolean>,  // Playwright params requires this exact type
): Promise<AuditTrailPage> {
  const res = await request.get('/api/audit', {
    headers: { Authorization: `Bearer ${token}` },
    params: qs,
  });
  return res.json();
}
```

**Type constraint:** Playwright's `params` option requires `Record<string, string | number | boolean>`. Do not type query-string arguments as `unknown` or `object`.

---

## 9. Typed test data

Define TypeScript types for all test entities and export named constants. Specs import constants directly — never hardcode IDs, credentials, or domain values inline.

```ts
// support/types/index.ts
export type UserRole = 'User' | 'Admin';

export interface TestUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface TestItemType {
  id: string;
  name: string;
  allowedRoles: UserRole[];
}

export interface TestItem {
  itemType: TestItemType;
  startDate: string;
  endDate: string;
  description?: string;
  notes?: string;
}
```

```ts
// support/testdata/users.ts
export const USER_ADMIN: TestUser = {
  id: '...', username: 'admin', password: 'Admin!123', name: 'Alice Admin', role: 'Admin',
};
export const USER_STANDARD: TestUser = {
  id: '...', username: 'user', password: 'User!123', name: 'Eddie User', role: 'User',
};
```

Export derived subsets where useful:

```ts
export const ALL_USERS = [USER_ADMIN, USER_STANDARD] as const;
export const ADMIN_USERS = ALL_USERS.filter((u) => u.role === 'Admin');
export const STANDARD_USERS = ALL_USERS.filter((u) => u.role === 'User');
```

---

## 10. Date helpers

Provide at minimum an offset-based ISO date generator and a display-format converter matching the app's date presentation:

```ts
// support/helpers/dates.ts

// Returns 'YYYY-MM-DD' relative to today (negative = past, 0 = today, positive = future)
export function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// Returns the UI's display format, e.g. 'DD-MM-YYYY'
export function displayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}
```

Adapt `displayDate` to match whatever format the application renders dates in.

---

## 11. Text constants

All UI strings (error messages, labels, dialog copy, empty states) live in `support/constants.ts` as a nested `const` object. Never hardcode UI strings inline in specs.

```ts
// support/constants.ts
export const TEXTS = {
  ENTITY_LIST: {
    EMPTY_STATE: 'No items found',
    ERROR_STATE: 'Something went wrong. Please try again.',
    FORM_OVERLAP_ERROR: 'An item already exists for part of this period.',
  },
  CONFIRMATION_DIALOG: {
    TITLE: 'Delete item',
    MESSAGE: 'Are you sure? This action cannot be undone.',
    CONFIRM_LABEL: 'Delete',
    CANCEL_LABEL: 'Cancel',
  },
} as const;
```

In specs:

```ts
import { TEXTS } from '../../support/constants';
await entityForm.checkFormError(TEXTS.ENTITY_LIST.FORM_OVERLAP_ERROR);
```

---

## 12. Spec structure

```ts
// All imports from fixtures — never from @playwright/test directly
import { test, expect }    from '../../support/fixtures';
import { USER_STANDARD }   from '../../support/testdata/users';
import { ITEM_TYPE_A }     from '../../support/testdata/itemTypes';
import { TEXTS }           from '../../support/constants';
import { apiSignIn, apiCleanupItems, apiCreateItem } from '../../support/helpers/api';
import { isoDate, displayDate } from '../../support/helpers/dates';

test.describe('Entity List', () => {
  let userToken: string;

  test.beforeEach(async ({ request, page, signInPage, entityListPage }) => {
    // 1. API auth + cleanup (parallelize where safe)
    userToken = await apiSignIn(request, USER_STANDARD.username, USER_STANDARD.password);
    await apiCleanupItems(request, userToken);

    // 2. UI sign-in
    await signInPage.visit();
    await signInPage.signInAs(USER_STANDARD);

    // 3. Navigate — waitForResponse BEFORE the navigation action
    const resp = page.waitForResponse('**/api/items');
    await entityListPage.visit();
    await resp;
  });

  test.afterEach(async ({ request }) => {
    if (userToken) await apiCleanupItems(request, userToken);
  });

  test('shows empty state when no items exist', async ({ entityListPage }) => {
    await entityListPage.checkEmptyState();
  });

  test.describe('error state', () => {
    test('shows error when API fails', async ({ page, entityListPage }) => {
      await page.route('/api/items', (route) => route.fulfill({ status: 500 }));
      const errResp = page.waitForResponse('/api/items');
      await entityListPage.visit();
      await errResp;
      await entityListPage.checkErrorState();
    });
  });
});
```

### `test.beforeAll` for API-only describe blocks

When a `describe` block contains only API-level tests that share one token, acquire it once in `beforeAll`:

```ts
test.describe('API access control', () => {
  let standardToken: string;

  test.beforeAll(async ({ request }) => {
    standardToken = await apiSignIn(request, USER_STANDARD.username, USER_STANDARD.password);
  });

  test('GET /api/admin — standard-role token returns 403', async ({ request }) => {
    const res = await request.get('/api/admin', {
      headers: { Authorization: `Bearer ${standardToken}` },
    });
    expect(res.status()).toBe(403);
  });
});
```

---

## 13. Switching auth users mid-test

When a test navigates as one user then needs to operate as another, clear both cookies and localStorage. Clearing only cookies is insufficient — the app's client session may survive in localStorage:

```ts
await page.context().clearCookies();
await page.evaluate(() => localStorage.clear());
// Then sign in as the new user
await signInPage.visit();
await signInPage.signInAs(USER_ADMIN);
```

---

## 14. Accessibility checking

`support/helpers/a11y.ts` wraps `@axe-core/playwright` for WCAG 2.2 AA checks. It imports `expect` from `@playwright/test` directly (not from fixtures) to avoid a circular dependency — this is the documented exception.

```ts
// support/helpers/a11y.ts
import AxeBuilder from '@axe-core/playwright';
import { createHtmlReport } from 'axe-html-reporter';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const WCAG_22_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export async function checkA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA_TAGS).analyze();
  if (results.violations.length > 0) {
    createHtmlReport({
      results: { violations: results.violations },
      options: { outputDir: 'reports/a11y', reportFileName: 'a11y-report.html' },
    });
  }
  expect(results.violations).toHaveLength(0);
}
```

In a spec, call after the page has fully loaded:

```ts
import { checkA11y } from '../../support/helpers/a11y';

test('page meets WCAG 2.2 AA', async ({ page, signInPage, entityListPage }) => {
  await signInPage.visit();
  await signInPage.signInAs(USER_STANDARD);
  const resp = page.waitForResponse('**/api/items');
  await entityListPage.visit();
  await resp;
  await checkA11y(page);
});
```

Pin `axe-html-reporter` to an exact version (no caret `^`) to prevent silent reporter format changes.

---

## 15. Append-only data: baseline-count pattern

For data stores that are never cleared between tests (e.g., audit logs, event streams), assert on the **delta** relative to a baseline captured before the action under test — not on an absolute total:

```ts
// Capture baseline before the action
const baseline = await apiGetAuditLog(request, adminToken, { entityId: id });
const baselineCount = baseline.totalCount;

// Perform the action
await apiCreateItem(request, userToken, { ... });

// Assert delta
const after = await apiGetAuditLog(request, adminToken, { entityId: id });
expect(after.totalCount).toBe(baselineCount + 1);
expect(after.items[0].action).toBe('Insert');
```

Filter by `entityId` (or equivalent) so only entries for the specific entity under test are counted.

---

## 16. Package scripts

```jsonc
{
  "scripts": {
    "typecheck":       "tsc --noEmit",
    "lint":            "eslint .",
    "lint:fix":        "eslint . --fix",
    "check":           "pnpm lint && pnpm typecheck",
    "open:chrome":     "playwright test --ui --project=chromium",
    "headless:chrome": "playwright test --project=chromium"
  }
}
```

Run from the package root: `pnpm headless:chrome`. Always run `pnpm typecheck` before committing.

---

## 17. Scaffolding

### New spec file

1. Create `e2e/<feature-area>/<feature>.spec.ts`
2. Import `test` and `expect` from `../../support/fixtures` (only)
3. Import testdata, TEXTS, api helpers, date helpers as needed
4. Structure: outer `test.describe` → `test.beforeEach` (cleanup + sign-in + navigate with `waitForResponse`) → `test.afterEach` (cleanup) → nested `test.describe` groups per sub-feature
5. Use `page.waitForResponse('**/api/...')` BEFORE every navigation or action that triggers a network fetch
6. Use `page.route()` + `page.unroute()` for error-state and retry tests
7. Use `.not.toBeAttached()` for absence assertions
8. Use `TEXTS.*` for all UI string assertions — never hardcode

### New page object

1. Create `support/pages/<PageName>.ts`
2. Export a named class with `constructor(private readonly page: Page) {}`
3. Add the import to `support/fixtures.ts`
4. Add the property to the `PageObjects` type
5. Add the fixture binding: `pageName: async ({ page }, use) => { await use(new PageName(page)); }`
6. Specs receive the new page object automatically via fixture destructuring

### New API helper

1. Add a named async function to `support/helpers/api.ts`
2. First parameter: `request: APIRequestContext`
3. Auth parameter: `token: string` (Bearer token, not session cookie)
4. Query string params: `Record<string, string | number | boolean>` (required by Playwright's `params`)
5. Export the function and any new types it requires

### New testdata constant

1. Add to the appropriate file in `support/testdata/`
2. Type it against the interface in `support/types/index.ts`
3. Export it as a named `const` with a descriptive all-caps name

---

## 19. Parallel execution rules (`fullyParallel: true`)

When `fullyParallel: true` is set, every test — including tests within the same `describe` block — can run concurrently in separate browser contexts. The following rules must all hold. Violating any of them produces intermittent failures that are hard to reproduce locally.

### Rule 1: each test is fully self-contained

Every test creates its own data in `beforeEach` and deletes it in `afterEach` using the exact IDs returned from creation. No test may depend on data left by another test, and no `beforeEach` may rely on data created outside its own scope.

```ts
test.beforeEach(async ({ request }) => {
  token = await apiSignIn(request, USER_STANDARD.username, USER_STANDARD.password);
  itemId = await apiCreateItem(request, token, { name: `item-${Date.now()}`, ... });
});

test.afterEach(async ({ request }) => {
  if (token && itemId) await apiDeleteItem(request, token, itemId);
});
```

### Rule 2: no blanket cleanup

Helpers that delete **all** records for a user (e.g., `apiCleanupItems`) are safe in serial mode but destructive in parallel — a concurrent test's data will be deleted mid-run. Replace them with targeted deletes using tracked IDs:

```ts
// ✅ Parallel-safe — deletes only what this test created
await apiDeleteItem(request, token, itemId);

// ❌ Parallel-unsafe — deletes everything, including other tests' data
await apiCleanupItems(request, token);
```

### Rule 3: no describe-level mutable variables shared across tests

In serial mode, a `let` variable declared at `describe` scope and set in `beforeEach` is safe because tests run one at a time. In fully parallel mode, multiple tests in the same describe block run concurrently and overwrite each other's value of that variable.

Move all per-test state into the `beforeEach`/`afterEach` closure, or use a `Map` keyed by `test.info().testId`:

```ts
// ✅ Parallel-safe — each test has its own token via closure
test.beforeEach(async ({ request }) => {
  const token = await apiSignIn(request, ...);
  // use token inside beforeEach or pass via fixture
});

// ❌ Parallel-unsafe — shared variable overwritten by concurrent tests
let token: string;
test.beforeEach(async ({ request }) => {
  token = await apiSignIn(request, ...);
});
```

### Rule 4: use unique data per test

Tests that create entities with fixed names or identifiers will conflict when run concurrently. Append a unique suffix to any name or value that must be distinct across concurrent test runs:

```ts
const uniqueName = `Item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const itemId = await apiCreateItem(request, token, { name: uniqueName, ... });
```

Alternatively, design the backend to scope data to the authenticated user so different user tokens naturally isolate data.

### Rule 5: `test.beforeAll` is worker-local

In parallel mode, `beforeAll` runs once **per worker**, not once globally across all workers. Do not use `beforeAll` to set up shared mutable state you expect all tests to see — each worker starts with its own fresh run of `beforeAll`. `beforeAll` remains useful for acquiring a read-only token shared across the API tests within one worker's describe block.

### Rule 6: `page.route()` is always safe

`page.route()` intercepts requests for a specific `page` instance. Because each parallel test has its own browser context and page, route interceptions never bleed between tests. No changes needed here.

### Rule 7: size `workers` to the DB connection limit

Each worker opens its own connections. Set `workers` to a value your database and application can sustain concurrently. A common starting point is the number of available CI cores, capped at whatever the DB connection pool allows.

### Parallel mode checklist

Before enabling `fullyParallel: true`, verify:

- [ ] `beforeEach` creates all required data; `afterEach` deletes only what it created (by ID)
- [ ] No blanket cleanup helpers remain in use
- [ ] No describe-level `let` variables are mutated across tests
- [ ] All created entity names/identifiers are unique per test run
- [ ] `beforeAll` usage is limited to read-only or worker-local setup
- [ ] `workers` count is within the DB connection pool budget

---

## 20. Common pitfalls

| Pitfall | Fix |
|---|---|
| `waitForResponse` called after the triggering action | Always assign the Promise BEFORE navigating or clicking |
| `.not.toBeVisible()` for element absence | Use `.not.toBeAttached()` |
| Importing `test` or `expect` from `@playwright/test` in a spec | Import from `../../support/fixtures` only |
| `clearCookies()` alone when switching users | Also call `page.evaluate(() => localStorage.clear())` |
| Forgetting `page.unroute()` before asserting retry | Call `unroute` before the retry action |
| Hardcoding UI strings in specs | Always use `TEXTS.*` constants |
| Typing query-string params as `unknown` or `object` | Use `Record<string, string \| number \| boolean>` |
| `workers > 1` or `fullyParallel: true` with tests that share state | Keep serial, or apply all rules from section 19 |
| Blanket cleanup helper used in parallel mode | Replace with targeted deletes by ID |
| Describe-level `let` variable mutated across parallel tests | Move per-test state into `beforeEach`/`afterEach` closure |
| Fixed entity names in parallel mode | Append `Date.now()` or a random suffix |
| Using `beforeAll` for shared mutable state in parallel mode | `beforeAll` is worker-local; use `beforeEach` for per-test state |
| Adding a page object class but forgetting to wire it into fixtures.ts | Add the type entry and the fixture binding |
