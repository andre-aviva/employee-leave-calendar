# Playwright E2E Suite — Design

**Date:** 2026-06-27
**Status:** Approved

## Goal

Add a Playwright E2E suite that mirrors the existing Cypress suite in `tests/` — same test cases, same page-object structure, full accessibility coverage — as a sibling directory `playwright/`.

---

## 1. Structure & package setup

```
playwright/                          ← sibling to tests/
  e2e/
    a11y/              accessibility.spec.ts
    audit-trail/       audit-trail.spec.ts
    calendar/          calendar-overview.spec.ts
    leave-management/  leave-management.spec.ts
    my-leave/          my-leave.spec.ts
    navigation/        navigation-bar.spec.ts
    security/          security.spec.ts
    sign-in/           sign-in.spec.ts
    shared/
      confirmation-dialog.spec.ts
      leave-type-badge.spec.ts
  support/
    fixtures.ts        ← extended `test` export; all page objects injected
    pages/
      SignInPage.ts
      NavigationBar.ts
      LeaveForm.ts
      CalendarPage.ts
      ConfirmationDialog.ts
      MyLeavePage.ts
      AdminLeavePage.ts
    helpers/
      api.ts
      dates.ts
      element.ts
      a11y.ts
    testdata/
      employees.ts
      leaveTypes.ts
    types/
      index.ts
    constants.ts
  playwright.config.ts
  package.json
  tsconfig.json
```

Spec file count and directory names mirror Cypress exactly. Shared building blocks (testdata, types, constants, helpers) are duplicated into `playwright/support/` since this is a separate package — not shared with `tests/`.

**Dependencies:**
- `@playwright/test`
- `@axe-core/playwright`
- `axe-html-reporter` (same version as Cypress: `2.2.11`)
- `typescript`
- `eslint`, `eslint-config-prettier`, `typescript-eslint`

---

## 2. Page objects & fixtures pattern

Page objects are **instance-based classes** — `page: Page` is injected via the constructor. Method names are kept identical to the Cypress equivalents (`visit`, `signIn`, `signInAs`, `checkErrorVisible`, `clickRegister`, etc.) so test logic reads as close to the Cypress originals as possible.

```ts
// support/pages/SignInPage.ts
export class SignInPage {
  constructor(private readonly page: Page) {}

  async visit() { await this.page.goto('/sign-in'); }
  getUsernameInput() { return this.page.locator('[data-test="SignIn_UsernameInput"]'); }
  async fillUsername(value: string) { await this.getUsernameInput().fill(value); }
  async signIn(username: string, password: string) { /* fill + submit + wait for response */ }
  async signInAs(employee: TestEmployee) { await this.signIn(employee.username, employee.password); }
  async checkErrorVisible() { await expect(this.page.locator('[data-test="SignIn_ErrorMessage"]')).toBeVisible(); }
  async checkRedirectedToCalendar() { await expect(this.page).toHaveURL(/\/calendar/); }
}
```

`support/fixtures.ts` extends Playwright's base `test` and injects all seven page objects. All specs import `test` and `expect` exclusively from here — never directly from `@playwright/test`.

```ts
// support/fixtures.ts
import { test as base, expect } from '@playwright/test';
import { SignInPage } from './pages/SignInPage';
// ... other imports

type PageObjects = {
  signInPage: SignInPage;
  navigationBar: NavigationBar;
  leaveForm: LeaveForm;
  calendarPage: CalendarPage;
  confirmationDialog: ConfirmationDialog;
  myLeavePage: MyLeavePage;
  adminLeavePage: AdminLeavePage;
};

export const test = base.extend<PageObjects>({
  signInPage: async ({ page }, use) => use(new SignInPage(page)),
  navigationBar: async ({ page }, use) => use(new NavigationBar(page)),
  leaveForm: async ({ page }, use) => use(new LeaveForm(page)),
  calendarPage: async ({ page }, use) => use(new CalendarPage(page)),
  confirmationDialog: async ({ page }, use) => use(new ConfirmationDialog(page)),
  myLeavePage: async ({ page }, use) => use(new MyLeavePage(page)),
  adminLeavePage: async ({ page }, use) => use(new AdminLeavePage(page)),
});

export { expect };
```

Specs destructure only what they need:

```ts
import { test, expect } from '../../support/fixtures';

test.beforeEach(async ({ signInPage, myLeavePage, request }) => {
  const token = await apiSignIn(request, EMPLOYEE_EDDIE_EMPLOYEE.username, EMPLOYEE_EDDIE_EMPLOYEE.password);
  await apiCleanupMyLeave(request, token);
  await signInPage.visit();
  await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
  const leaveFetch = myLeavePage.page.waitForResponse('**/api/me/leave');
  await myLeavePage.visit();
  await leaveFetch;
});
```

The built-in `request` fixture (`APIRequestContext`) is available alongside page-object fixtures for API helper calls.

---

## 3. Key Cypress → Playwright translations

### Intercepts and waits

Playwright requires capturing the `waitForResponse` promise *before* the action that triggers the request:

```ts
// Spy-only (pass-through):
const leaveFetch = page.waitForResponse('**/api/me/leave');
await myLeavePage.visit();
await leaveFetch;

// Stubbed response (error state tests):
await page.route('/api/me/leave', route => route.fulfill({ status: 500 }));
const leaveFetch = page.waitForResponse('/api/me/leave');
await myLeavePage.visit();
await leaveFetch;
```

### API helpers

Plain `async` functions that accept `APIRequestContext` instead of using `cy.request()`:

```ts
export async function apiSignIn(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const res = await request.post('/api/auth/sign-in', { data: { username, password } });
  return (await res.json()).token;
}

export async function apiCleanupMyLeave(request: APIRequestContext, token: string): Promise<void> {
  const res = await request.get('/api/me/leave', { headers: { Authorization: `Bearer ${token}` } });
  const items: Array<{ id: string }> = await res.json();
  await Promise.all(items.map(({ id }) => apiDeleteMyLeave(request, token, id)));
}
```

### Assertions

| Cypress | Playwright |
|---|---|
| `.should('be.visible')` | `expect(locator).toBeVisible()` |
| `.should('not.exist')` | `expect(locator).toBeHidden()` |
| `.should('contain.text', x)` | `expect(locator).toContainText(x)` |
| `.should('have.text', x)` | `expect(locator).toHaveText(x)` |
| `.should('have.value', x)` | `expect(locator).toHaveValue(x)` |
| `.should('have.length', n)` | `expect(locator).toHaveCount(n)` |
| `.should('have.length.at.least', n)` | `expect(locator).toHaveCount(expect.any(Number))` / custom assertion |
| `.should('be.disabled')` | `expect(locator).toBeDisabled()` |
| `.should('not.be.disabled')` | `expect(locator).toBeEnabled()` |
| `cy.url().should('include', x)` | `expect(page).toHaveURL(/x/)` |
| `cy.url().should('not.include', x)` | `expect(page).not.toHaveURL(/x/)` |

### Input, hover, storage

```ts
// .clear().type(x)          → locator.fill(x)
// .select(x)                → locator.selectOption(x)
// .select([a, b])           → locator.selectOption([a, b])
// .realHover()              → locator.hover()
// cy.clearAllCookies()      → page.context().clearCookies()
// cy.clearAllLocalStorage() → page.evaluate(() => localStorage.clear())
// cy.visit(url)             → page.goto(url)
// before() / beforeEach()   → test.beforeAll() / test.beforeEach()
```

### Accessibility

```ts
// support/helpers/a11y.ts
import AxeBuilder from '@axe-core/playwright';
import { createHtmlReport } from 'axe-html-reporter';
import type { Page } from '@playwright/test';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export async function checkA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  if (results.violations.length > 0) {
    createHtmlReport({
      results: { violations: results.violations },
      options: { outputDir: 'playwright/reports/a11y', reportFileName: 'a11y-report.html' },
    });
  }
  // expect imported directly from @playwright/test here (not from fixtures.ts) to avoid circular deps
  expect(results.violations).toHaveLength(0);
}
```

---

## 4. Config & scripts

### `playwright.config.ts`

```ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,           // serial execution — tests share database state
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173/',
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

`workers: 1` enforces serial execution globally, matching Cypress's default behaviour and preventing cross-test database contamination.

### `package.json` scripts

| Script | Command | Purpose |
|---|---|---|
| `pnpm open` | `playwright test --ui` | Interactive UI mode |
| `pnpm headless` | `playwright test` | Run all specs headlessly |
| `pnpm headless:chrome` | `playwright test --project=chromium` | Chromium only |
| `pnpm lint` | `eslint .` | Lint |
| `pnpm lint:fix` | `eslint . --fix` | Lint + fix |
| `pnpm typecheck` | `tsc --noEmit` | Type-check |
| `pnpm check` | `pnpm lint && pnpm typecheck` | Lint + typecheck |

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["ES2021", "dom"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["e2e/**/*.ts", "support/**/*.ts", "playwright.config.ts"]
}
```

---

## 5. Decisions & constraints

- **Serial execution** (`workers: 1`) is required because all tests share the same three seeded database users (Alice Admin, Eddie Employee, Nora Newbie) and mutate leave registrations.
- **Separate package** — testdata, types, constants, and helpers are duplicated into `playwright/support/`. No cross-package imports between `tests/` and `playwright/`.
- **Chromium only** by default, matching the Cypress Chrome-family default. Firefox/WebKit can be added as additional projects later.
- **Accessibility** uses `@axe-core/playwright` + the same `axe-html-reporter` version as Cypress. Violations fail the test and generate an HTML report in `playwright/reports/a11y/`.
- **`.should('have.length.at.least', n)`** — translated as `expect(await locator.count()).toBeGreaterThanOrEqual(n)` in page-object check methods.
- **`cy.wrap().as()` aliases** used in calendar spec for storing initial month label — translated to plain `const` variables in Playwright since there is no command queue.
