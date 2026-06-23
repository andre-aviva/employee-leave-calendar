# E2E Test Spec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write all Cypress E2E spec files covering the scenarios in `tests/plan.md`, covering Sign In, Navigation Bar, Calendar Overview, My Leave, Leave Management, and Security.

> **Status: ✅ Complete** — all tasks done and merged through PR #83. See `tests/plan.md` for the live scenario inventory and current state.

**Architecture:** Specs import Page Object Models from `tests/cypress/support/pages/` and typed test data from `tests/cypress/support/testdata/`. API-level seeding (`cy.request`) ensures each test starts in a known database state without relying on UI actions for setup/teardown. All specs are blocked on frontend implementation — verify with `pnpm typecheck` until the frontend serves on `http://localhost:3000`.

**Tech Stack:** Cypress 15.17.0, TypeScript, cypress-real-events, cypress-terminal-report, cypress-recurse

## Global Constraints

- All element selectors via the `element()` helper (`tests/cypress/support/helpers/element.ts`) — never raw `[data-test="..."]` strings in spec files (except where a POM getter does not yet exist)
- All UI string assertions use `TEXTS.*` constants from `tests/cypress/support/constants.ts` — never hardcode error or empty-state text in specs
- Use `EMPLOYEE_*` and `LEAVE_TYPE_*` constants from testdata — never hardcode credentials, names, or GUIDs
- Sign in via `SignInPage.signInAs()` in each spec's `beforeEach` for the browser session; get an API token via a separate `cy.request` in `beforeEach` for data seeding/cleanup
- Tests that write to the database must clean up in both `beforeEach` (for robustness) and `afterEach` (immediate tidy)
- `failOnStatusCode: false` on all cleanup `cy.request` calls — a 404 (already deleted) is silently ignored
- `baseUrl` in `cypress.config.ts` is `http://localhost:3000` — update once Aspire confirms the Vite dev server port
- All dates computed with `isoDate(offsetDays)` from `helpers/dates.ts` — never hardcode `YYYY-MM-DD` strings in specs
- **Each task is one GitHub-Flow PR**: branch off up-to-date `main` → atomic commit(s) → push → open PR → squash-merge before starting the next task
- **API date wire format is `YYYY-MM-DD`** (ISO) — `isoDate()` returns this format; `displayDate()` converts to DD-MM-YYYY for UI assertions

---

### Task 1: Update tests/plan.md with discovered scenario gaps ✅ Done — PR #38

Merged. `tests/plan.md` now contains the correct Nav Bar Admin scenario and all missing edge-case scenarios (1-day leave, adjacent overlap, DD-MM-YYYY format).

---

### Task 2: Types, date helper, and API helper (shared infrastructure) ✅ Done — PR #40

**Branch:** `test/e2e-types-and-helpers`

**Files:**
- Modify: `tests/cypress/support/types/index.ts`
- Modify: `tests/cypress/support/testdata/employees.ts`
- Modify: `tests/cypress/support/testdata/leaveTypes.ts`
- Create: `tests/cypress/support/helpers/dates.ts`
- Create: `tests/cypress/support/helpers/api.ts`

Tasks 2 and 3 from the original plan are merged here: the GUIDs, date utility, and API seeding helper are all shared infrastructure with no user-facing behaviour — splitting them creates a state where the helper exists but nothing uses it.

- [x] **Step 1: Branch off main**

  ```bash
  git checkout main
  git pull --ff-only origin main
  git checkout -b test/e2e-types-and-helpers
  ```

- [x] **Step 2: Add `id: string` to both interfaces in `types/index.ts`**

  ```typescript
  export type EmployeeRole = 'Employee' | 'Admin';

  export interface TestEmployee {
    id: string;
    username: string;
    password: string;
    name: string;
    role: EmployeeRole;
  }

  export interface TestLeaveType {
    id: string;
    name: string;
    registerableBy: EmployeeRole[];
  }

  export interface TestLeaveRegistration {
    leaveType: TestLeaveType;
    startDate: string;
    endDate: string;
    description?: string;
    notes?: string;
  }
  ```

- [x] **Step 3: Populate IDs in `testdata/leaveTypes.ts`**

  GUIDs from `src/backend/LeaveCalendar.Web/Infrastructure/Persistence/DbSeeder.cs`.

  ```typescript
  import type { TestLeaveType } from '../types';

  export const LEAVE_TYPE_VACATION: TestLeaveType = {
    id: '11111111-0000-0000-0000-000000000001',
    name: 'Vacation',
    registerableBy: ['Employee', 'Admin'],
  };

  export const LEAVE_TYPE_SICK_LEAVE: TestLeaveType = {
    id: '11111111-0000-0000-0000-000000000002',
    name: 'Sick Leave',
    registerableBy: ['Employee', 'Admin'],
  };

  export const LEAVE_TYPE_PUBLIC_HOLIDAY: TestLeaveType = {
    id: '11111111-0000-0000-0000-000000000003',
    name: 'Public Holiday',
    registerableBy: ['Admin'],
  };

  export const LEAVE_TYPE_OTHER: TestLeaveType = {
    id: '11111111-0000-0000-0000-000000000004',
    name: 'Other',
    registerableBy: ['Employee', 'Admin'],
  };

  export const ALL_LEAVE_TYPES = [
    LEAVE_TYPE_VACATION,
    LEAVE_TYPE_SICK_LEAVE,
    LEAVE_TYPE_PUBLIC_HOLIDAY,
    LEAVE_TYPE_OTHER,
  ] as const;

  export const EMPLOYEE_REGISTERABLE_LEAVE_TYPES = ALL_LEAVE_TYPES.filter((t) =>
    t.registerableBy.includes('Employee'),
  );
  ```

- [x] **Step 4: Populate IDs in `testdata/employees.ts`**

  ```typescript
  import type { TestEmployee } from '../types';

  export const EMPLOYEE_ALICE_ADMIN: TestEmployee = {
    id: '22222222-0000-0000-0000-000000000001',
    username: 'admin',
    password: 'Admin!123',
    name: 'Alice Admin',
    role: 'Admin',
  };

  export const EMPLOYEE_EDDIE_EMPLOYEE: TestEmployee = {
    id: '22222222-0000-0000-0000-000000000002',
    username: 'employee',
    password: 'Employee!123',
    name: 'Eddie Employee',
    role: 'Employee',
  };

  export const EMPLOYEE_NORA_NEWBIE: TestEmployee = {
    id: '22222222-0000-0000-0000-000000000003',
    username: 'nora',
    password: 'Employee!123',
    name: 'Nora Newbie',
    role: 'Employee',
  };

  export const ALL_EMPLOYEES = [
    EMPLOYEE_ALICE_ADMIN,
    EMPLOYEE_EDDIE_EMPLOYEE,
    EMPLOYEE_NORA_NEWBIE,
  ] as const;

  export const ADMIN_EMPLOYEES = ALL_EMPLOYEES.filter((e) => e.role === 'Admin');
  export const STANDARD_EMPLOYEES = ALL_EMPLOYEES.filter((e) => e.role === 'Employee');
  ```

- [x] **Step 5: Commit the type and testdata changes**

  ```bash
  git add tests/cypress/support/types/index.ts \
          tests/cypress/support/testdata/employees.ts \
          tests/cypress/support/testdata/leaveTypes.ts
  git commit -m "test(types): add seeded GUIDs to TestEmployee and TestLeaveType"
  ```

- [x] **Step 6: Create `helpers/dates.ts`**

  ```typescript
  export function isoDate(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }

  export function displayDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  }
  ```

- [x] **Step 7: Create `helpers/api.ts`**

  `GET /api/admin/leave` returns a `PagedResult` envelope `{ items: [...] }`. `GET /api/me/leave` returns a plain array. Both are reflected below.

  ```typescript
  interface ApiItem { id: string; }
  interface PagedResult { items: ApiItem[]; }

  interface RegisterBody {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    description?: string;
    notes?: string;
  }

  interface AdminCreateBody {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    description?: string;
    notes?: string;
  }

  export function apiSignIn(username: string, password: string): Cypress.Chainable<string> {
    return cy
      .request<{ token: string }>({ method: 'POST', url: '/api/auth/sign-in', body: { username, password } })
      .its('body.token');
  }

  export function apiCreateMyLeave(token: string, body: RegisterBody): Cypress.Chainable<string> {
    return cy
      .request<ApiItem>({
        method: 'POST',
        url: '/api/me/leave',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      .its('body.id');
  }

  export function apiDeleteMyLeave(token: string, id: string): Cypress.Chainable<void> {
    return cy
      .request({
        method: 'DELETE',
        url: `/api/me/leave/${id}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      })
      .then(() => undefined);
  }

  export function apiCleanupMyLeave(token: string): void {
    cy.request<ApiItem[]>({
      method: 'GET',
      url: '/api/me/leave',
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ body }) => {
      body.forEach(({ id }) => apiDeleteMyLeave(token, id));
    });
  }

  export function apiAdminCreateLeave(token: string, body: AdminCreateBody): Cypress.Chainable<string> {
    return cy
      .request<ApiItem>({
        method: 'POST',
        url: '/api/admin/leave',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      .its('body.id');
  }

  export function apiAdminDeleteLeave(token: string, id: string): Cypress.Chainable<void> {
    return cy
      .request({
        method: 'DELETE',
        url: `/api/admin/leave/${id}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      })
      .then(() => undefined);
  }

  export function apiCleanupAdminLeave(token: string): void {
    cy.request<PagedResult>({
      method: 'GET',
      url: '/api/admin/leave',
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ body }) => {
      body.items.forEach(({ id }) => apiAdminDeleteLeave(token, id));
    });
  }
  ```

- [x] **Step 8: Commit the helpers**

  ```bash
  git add tests/cypress/support/helpers/dates.ts \
          tests/cypress/support/helpers/api.ts
  git commit -m "test(helpers): add date utilities and API seeding helpers"
  ```

- [ ] **Step 9: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [ ] **Step 10: Push, open PR, and squash-merge**

  ```bash
  git push -u origin test/e2e-types-and-helpers
  gh pr create --base main \
    --title "test(e2e): add seeded IDs, date helper, and API seeding helper" \
    --body "Shared infrastructure for all E2E spec tasks. Adds fixed GUIDs to TestEmployee and TestLeaveType (from DbSeeder.cs), a date offset utility, and cy.request helpers for API-level test data setup/teardown. No spec files yet — all later spec tasks depend on this."
  gh pr view <n> --json mergeable,mergeStateStatus --jq '{mergeable,state:.mergeStateStatus}'
  gh pr merge <n> --squash --delete-branch
  ```

---

### Task 3: Sign In spec ✅ Done — PR #41

**Branch:** `test/e2e-sign-in-spec`

**Files:**
- Create: `tests/cypress/e2e/sign-in/sign-in.cy.ts`

- [x] **Step 1: Branch off main**

  ```bash
  git checkout main
  git pull --ff-only origin main
  git checkout -b test/e2e-sign-in-spec
  ```

- [x] **Step 2: Write `sign-in.cy.ts`**

  ```typescript
  import SignInPage from '../../support/pages/SignInPage';
  import { EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';

  describe('Sign In', () => {
    beforeEach(() => {
      SignInPage.visit();
    });

    it('happy path — valid credentials redirect to /calendar', () => {
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      SignInPage.checkRedirectedToCalendar();
    });

    it('wrong credentials — error message shown on page', () => {
      SignInPage.signIn(EMPLOYEE_EDDIE_EMPLOYEE.username, 'wrong-password');
      SignInPage.checkErrorVisible();
      cy.url().should('include', '/sign-in');
    });

    it('already signed in — navigating to /sign-in redirects to /calendar', () => {
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      SignInPage.checkRedirectedToCalendar();
      SignInPage.visit();
      cy.url().should('include', '/calendar');
    });

    it('unauthenticated — navigating to a protected page redirects to /sign-in', () => {
      cy.visit('/my-leave');
      cy.url().should('include', '/sign-in');
    });
  });
  ```

- [x] **Step 3: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [x] **Step 4: Commit**

  ```bash
  git add tests/cypress/e2e/sign-in/sign-in.cy.ts
  git commit -m "test(sign-in): add sign-in E2E spec"
  ```

- [x] **Step 5: Push, open PR, and squash-merge**

  ```bash
  git push -u origin test/e2e-sign-in-spec
  gh pr create --base main \
    --title "test(sign-in): add sign-in E2E spec" \
    --body "Covers: happy path, wrong credentials, already-signed-in redirect, and unauthenticated redirect. Blocked on frontend implementation — typecheck passes."
  gh pr view <n> --json mergeable,mergeStateStatus --jq '{mergeable,state:.mergeStateStatus}'
  gh pr merge <n> --squash --delete-branch
  ```

---

### Task 4: Navigation Bar spec ✅ Done — PR #42

**Branch:** `test/e2e-nav-bar-spec`

**Files:**
- Create: `tests/cypress/e2e/navigation/navigation-bar.cy.ts`

Per the functional spec (Nav Bar page): My Leave link has **no role restriction**; Leave Management is Admin-only. Admin sees all three links. `NavigationBar.checkAdminLinks()` is already correct.

- [x] **Step 1: Branch off main**

  ```bash
  git checkout main
  git pull --ff-only origin main
  git checkout -b test/e2e-nav-bar-spec
  ```

- [x] **Step 2: Write `navigation-bar.cy.ts`**

  ```typescript
  import SignInPage from '../../support/pages/SignInPage';
  import NavigationBar from '../../support/pages/NavigationBar';
  import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';

  describe('Navigation Bar', () => {
    it('Employee — sees Calendar and My Leave, no Leave Management link', () => {
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      NavigationBar.checkEmployeeLinks();
    });

    it('Admin — sees Calendar, My Leave, and Leave Management', () => {
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
      NavigationBar.checkAdminLinks();
    });

    it('signed-in user name is displayed in the nav bar', () => {
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      NavigationBar.checkUserName(EMPLOYEE_EDDIE_EMPLOYEE.name);
    });

    it('sign out — redirected to /sign-in', () => {
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      NavigationBar.clickSignOut();
      cy.url().should('include', '/sign-in');
    });
  });
  ```

- [x] **Step 3: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [x] **Step 4: Commit**

  ```bash
  git add tests/cypress/e2e/navigation/navigation-bar.cy.ts
  git commit -m "test(nav): add navigation bar E2E spec"
  ```

- [x] **Step 5: Push, open PR, and squash-merge**

  ```bash
  git push -u origin test/e2e-nav-bar-spec
  gh pr create --base main \
    --title "test(nav): add navigation bar E2E spec" \
    --body "Covers: Employee links, Admin links (Calendar + My Leave + Leave Management per functional spec), user name display, sign out. Blocked on frontend implementation — typecheck passes."
  gh pr view <n> --json mergeable,mergeStateStatus --jq '{mergeable,state:.mergeStateStatus}'
  gh pr merge <n> --squash --delete-branch
  ```

---

### Task 5: Calendar Overview spec ✅ Done — PR #43

**Branch:** `test/e2e-calendar-spec`

**Files:**
- Create: `tests/cypress/e2e/calendar/calendar-overview.cy.ts`

The month-boundary test seeds leave via the admin API and cleans up in `afterEach`.

- [x] **Step 1: Branch off main**

  ```bash
  git checkout main
  git pull --ff-only origin main
  git checkout -b test/e2e-calendar-spec
  ```

- [x] **Step 2: Write `calendar-overview.cy.ts`**

  ```typescript
  import SignInPage from '../../support/pages/SignInPage';
  import CalendarPage from '../../support/pages/CalendarPage';
  import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
  import { LEAVE_TYPE_VACATION } from '../../support/testdata/leaveTypes';
  import { apiSignIn, apiAdminCreateLeave, apiAdminDeleteLeave } from '../../support/helpers/api';

  describe('Calendar Overview', () => {
    let adminToken: string;
    const createdIds: string[] = [];

    beforeEach(() => {
      apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then(
        (t) => { adminToken = t; },
      );
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      CalendarPage.visit();
    });

    afterEach(() => {
      createdIds.forEach((id) => apiAdminDeleteLeave(adminToken, id));
      createdIds.length = 0;
    });

    it('month navigation — next month updates the month label', () => {
      CalendarPage.getMonthLabel().invoke('text').as('initialMonth');
      CalendarPage.clickNextMonth();
      cy.get('@initialMonth').then((initial) => {
        CalendarPage.getMonthLabel().should('not.have.text', initial as string);
      });
      CalendarPage.clickPrevMonth();
      cy.get('@initialMonth').then((initial) => {
        CalendarPage.getMonthLabel().should('have.text', initial as string);
      });
    });

    it('multi-day leave spanning a month boundary shows a chip in both months', () => {
      const today = new Date();
      const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        .toISOString().split('T')[0];
      const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
        .toISOString().split('T')[0];

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_ALICE_ADMIN.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: lastDayThisMonth,
        endDate: firstDayNextMonth,
      }).then((id) => createdIds.push(id));

      CalendarPage.visit();
      CalendarPage.getLeaveChips().should('have.length.at.least', 1);
      CalendarPage.clickNextMonth();
      CalendarPage.getLeaveChips().should('have.length.at.least', 1);
    });

    it('empty month — all day cells render, no leave chips (12 months ahead)', () => {
      for (let i = 0; i < 12; i++) CalendarPage.clickNextMonth();
      CalendarPage.getDayCells().should('have.length.at.least', 28);
      CalendarPage.getLeaveChips().should('not.exist');
    });

    it('error state — retry button reloads data', () => {
      cy.intercept('GET', '/api/calendar*', { statusCode: 500 }).as('calError');
      CalendarPage.visit();
      cy.wait('@calError');
      CalendarPage.checkErrorState();

      cy.intercept('GET', '/api/calendar*').as('calOk');
      CalendarPage.getRetryButton().click();
      cy.wait('@calOk');
      CalendarPage.getGrid().should('be.visible');
    });
  });
  ```

- [x] **Step 3: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [x] **Step 4: Commit**

  ```bash
  git add tests/cypress/e2e/calendar/calendar-overview.cy.ts
  git commit -m "test(calendar): add calendar overview E2E spec"
  ```

- [x] **Step 5: Push, open PR, and squash-merge**

  ```bash
  git push -u origin test/e2e-calendar-spec
  gh pr create --base main \
    --title "test(calendar): add calendar overview E2E spec" \
    --body "Covers: month navigation, multi-day leave spanning a month boundary, empty month, error state + retry. Blocked on frontend implementation — typecheck passes."
  gh pr view <n> --json mergeable,mergeStateStatus --jq '{mergeable,state:.mergeStateStatus}'
  gh pr merge <n> --squash --delete-branch
  ```

---

### Task 6: My Leave spec ✅ Done — PR #44

**Branch:** `test/e2e-my-leave-spec`

**Files:**
- Create: `tests/cypress/e2e/my-leave/my-leave.cy.ts`

`apiCleanupMyLeave` runs in both `beforeEach` (robustness if a previous test failed mid-cleanup) and `afterEach` (immediate tidy-up).

- [x] **Step 1: Branch off main**

  ```bash
  git checkout main
  git pull --ff-only origin main
  git checkout -b test/e2e-my-leave-spec
  ```

- [x] **Step 2: Write `my-leave.cy.ts`**

  ```typescript
  import SignInPage from '../../support/pages/SignInPage';
  import MyLeavePage from '../../support/pages/MyLeavePage';
  import LeaveForm from '../../support/pages/LeaveForm';
  import ConfirmationDialog from '../../support/pages/ConfirmationDialog';
  import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
  import { LEAVE_TYPE_VACATION, LEAVE_TYPE_PUBLIC_HOLIDAY } from '../../support/testdata/leaveTypes';
  import { TEXTS } from '../../support/constants';
  import { apiSignIn, apiCreateMyLeave, apiCleanupMyLeave } from '../../support/helpers/api';
  import { isoDate, displayDate } from '../../support/helpers/dates';

  describe('My Leave', () => {
    let eddieToken: string;

    beforeEach(() => {
      apiSignIn(EMPLOYEE_EDDIE_EMPLOYEE.username, EMPLOYEE_EDDIE_EMPLOYEE.password).then(
        (t) => {
          eddieToken = t;
          apiCleanupMyLeave(t);
        },
      );
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      MyLeavePage.visit();
    });

    afterEach(() => {
      if (eddieToken) apiCleanupMyLeave(eddieToken);
    });

    // ── Table state ────────────────────────────────────────────────────────────

    describe('table state', () => {
      it('shows empty state when no registrations exist', () => {
        MyLeavePage.checkEmptyState();
      });

      it('shows error state when API returns 500', () => {
        cy.intercept('GET', '/api/me/leave', { statusCode: 500 }).as('leaveError');
        MyLeavePage.visit();
        cy.wait('@leaveError');
        MyLeavePage.checkErrorState();
      });

      it('retry button reloads data after error', () => {
        cy.intercept('GET', '/api/me/leave', { statusCode: 500 }).as('leaveError');
        MyLeavePage.visit();
        cy.wait('@leaveError');
        cy.intercept('GET', '/api/me/leave').as('leaveOk');
        MyLeavePage.getRetryButton().click();
        cy.wait('@leaveOk');
        MyLeavePage.getEmptyState().should('be.visible');
      });
    });

    // ── Register leave ─────────────────────────────────────────────────────────

    describe('register leave', () => {
      it('happy path — future start date, valid type → form closes, table refreshes', () => {
        MyLeavePage.clickRegister();
        LeaveForm.get().should('be.visible');
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(9) });
        LeaveForm.submit();
        LeaveForm.get().should('not.exist');
        MyLeavePage.checkRowCount(1);
      });

      it('start date = today → succeeds (today is a valid start date)', () => {
        MyLeavePage.clickRegister();
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(0), endDate: isoDate(0) });
        LeaveForm.submit();
        LeaveForm.get().should('not.exist');
        MyLeavePage.checkRowCount(1);
      });

      it('past start date → START_DATE_IN_PAST error below Start Date field', () => {
        MyLeavePage.clickRegister();
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(-1), endDate: isoDate(1) });
        LeaveForm.submit();
        LeaveForm.checkStartDateError(TEXTS.MY_LEAVE.FORM_START_DATE_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('end date before start date → END_DATE_ERROR below End Date field', () => {
        MyLeavePage.clickRegister();
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(5), endDate: isoDate(3) });
        LeaveForm.submit();
        LeaveForm.checkEndDateError(TEXTS.MY_LEAVE.FORM_END_DATE_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('1-day leave (start == end) → succeeds', () => {
        const singleDay = isoDate(5);
        MyLeavePage.clickRegister();
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: singleDay, endDate: singleDay });
        LeaveForm.submit();
        LeaveForm.get().should('not.exist');
        MyLeavePage.checkRowCount(1);
      });

      it('overlap with existing registration → OVERLAP form-level error', () => {
        apiCreateMyLeave(eddieToken, {
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(5),
          endDate: isoDate(10),
        });
        MyLeavePage.visit();
        MyLeavePage.clickRegister();
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(12) });
        LeaveForm.submit();
        LeaveForm.checkFormError(TEXTS.MY_LEAVE.FORM_OVERLAP_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('leave starting the day an existing registration ends → OVERLAP (adjacency = overlap)', () => {
        apiCreateMyLeave(eddieToken, {
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(5),
          endDate: isoDate(10),
        });
        MyLeavePage.visit();
        MyLeavePage.clickRegister();
        // Start of new period == end of existing period — adjacency counts as overlap per business rules
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(10), endDate: isoDate(15) });
        LeaveForm.submit();
        LeaveForm.checkFormError(TEXTS.MY_LEAVE.FORM_OVERLAP_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('restricted leave type (Public Holiday) → TYPE_NOT_REGISTERABLE error below Leave Type field', () => {
        MyLeavePage.clickRegister();
        LeaveForm.fill({ leaveType: LEAVE_TYPE_PUBLIC_HOLIDAY, startDate: isoDate(5), endDate: isoDate(7) });
        LeaveForm.submit();
        // Exact error text is in the frontend resource file — assert text once frontend is implemented
        LeaveForm.get().should('be.visible');
      });

      it('cancel closes form without saving', () => {
        MyLeavePage.clickRegister();
        LeaveForm.get().should('be.visible');
        LeaveForm.cancel();
        LeaveForm.get().should('not.exist');
        MyLeavePage.checkEmptyState();
      });
    });

    // ── Edit and delete visibility ─────────────────────────────────────────────

    describe('edit and delete visibility', () => {
      it('buttons NOT visible on today-dated or past-dated registrations', () => {
        // Use admin API to seed a past-dated registration for Eddie (employees cannot register past dates)
        apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then((adminToken) => {
          cy.request({
            method: 'POST',
            url: '/api/admin/leave',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
              employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
              leaveTypeId: LEAVE_TYPE_VACATION.id,
              startDate: isoDate(-7),
              endDate: isoDate(-5),
            },
          });
        });
        MyLeavePage.visit();
        MyLeavePage.checkEditButtonNotExist(0);
        MyLeavePage.checkDeleteButtonNotExist(0);
      });

      it('buttons visible on future-dated registrations', () => {
        apiCreateMyLeave(eddieToken, {
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(7),
          endDate: isoDate(9),
        });
        MyLeavePage.visit();
        MyLeavePage.getEditButton(0).should('be.visible');
        MyLeavePage.getDeleteButton(0).should('be.visible');
      });
    });

    // ── Edit leave ─────────────────────────────────────────────────────────────

    describe('edit leave', () => {
      beforeEach(() => {
        apiCreateMyLeave(eddieToken, {
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(14),
          endDate: isoDate(16),
        });
        MyLeavePage.visit();
      });

      it('happy path — future registration → form closes, table refreshes', () => {
        MyLeavePage.clickEdit(0);
        LeaveForm.get().should('be.visible');
        LeaveForm.fillStartDate(isoDate(21));
        LeaveForm.fillEndDate(isoDate(23));
        LeaveForm.submit();
        LeaveForm.get().should('not.exist');
        MyLeavePage.checkRowCount(1);
      });

      it('set new start date to today → succeeds', () => {
        MyLeavePage.clickEdit(0);
        LeaveForm.fillStartDate(isoDate(0));
        LeaveForm.fillEndDate(isoDate(0));
        LeaveForm.submit();
        LeaveForm.get().should('not.exist');
        MyLeavePage.checkRowCount(1);
      });

      it('set new start date to past → START_DATE_IN_PAST error', () => {
        MyLeavePage.clickEdit(0);
        LeaveForm.fillStartDate(isoDate(-3));
        LeaveForm.fillEndDate(isoDate(16));
        LeaveForm.submit();
        LeaveForm.checkStartDateError(TEXTS.MY_LEAVE.FORM_START_DATE_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('end date before start date → END_DATE_ERROR', () => {
        MyLeavePage.clickEdit(0);
        LeaveForm.fillStartDate(isoDate(14));
        LeaveForm.fillEndDate(isoDate(12));
        LeaveForm.submit();
        LeaveForm.checkEndDateError(TEXTS.MY_LEAVE.FORM_END_DATE_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('cancel closes form without saving', () => {
        MyLeavePage.clickEdit(0);
        LeaveForm.get().should('be.visible');
        LeaveForm.fillStartDate(isoDate(21));
        LeaveForm.cancel();
        LeaveForm.get().should('not.exist');
        MyLeavePage.checkRowCount(1);
      });
    });

    // ── Delete leave ───────────────────────────────────────────────────────────

    describe('delete leave', () => {
      beforeEach(() => {
        apiCreateMyLeave(eddieToken, {
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(14),
          endDate: isoDate(16),
        });
        MyLeavePage.visit();
      });

      it('clicking delete opens Confirmation Dialog', () => {
        MyLeavePage.clickDelete(0);
        ConfirmationDialog.checkVisible();
      });

      it('cancel closes dialog without deleting', () => {
        MyLeavePage.clickDelete(0);
        ConfirmationDialog.checkVisible();
        ConfirmationDialog.clickCancel();
        ConfirmationDialog.checkNotExist();
        MyLeavePage.checkRowCount(1);
      });

      it('confirm → registration deleted, table refreshes', () => {
        MyLeavePage.clickDelete(0);
        ConfirmationDialog.clickConfirm();
        ConfirmationDialog.checkNotExist();
        MyLeavePage.checkEmptyState();
      });
    });

    // ── Date formatting ────────────────────────────────────────────────────────

    describe('date formatting', () => {
      it('dates in the leave table display as DD-MM-YYYY', () => {
        const startDate = isoDate(7);
        const endDate = isoDate(9);
        apiCreateMyLeave(eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate, endDate });
        MyLeavePage.visit();
        MyLeavePage.getRow(0).should('contain.text', displayDate(startDate));
        MyLeavePage.getRow(0).should('contain.text', displayDate(endDate));
      });
    });
  });
  ```

- [x] **Step 3: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [x] **Step 4: Commit**

  ```bash
  git add tests/cypress/e2e/my-leave/my-leave.cy.ts
  git commit -m "test(my-leave): add My Leave E2E spec"
  ```

- [x] **Step 5: Push, open PR, and squash-merge**

  ```bash
  git push -u origin test/e2e-my-leave-spec
  gh pr create --base main \
    --title "test(my-leave): add My Leave E2E spec" \
    --body "Covers: empty/error/retry states, register (happy path, today, past, end<start, 1-day, overlap, adjacency overlap, restricted type, cancel), edit/delete visibility, edit (happy path, today start, past start, end<start, cancel), delete (dialog, cancel, confirm), DD-MM-YYYY date format. Blocked on frontend implementation — typecheck passes."
  gh pr view <n> --json mergeable,mergeStateStatus --jq '{mergeable,state:.mergeStateStatus}'
  gh pr merge <n> --squash --delete-branch
  ```

---

### Task 7: Leave Management spec ✅ Done — PR #45

**Branch:** `test/e2e-leave-management-spec`

**Files:**
- Modify: `tests/cypress/support/constants.ts` — add `FORM_END_DATE_ERROR` to `LEAVE_MANAGEMENT`
- Modify: `tests/cypress/support/pages/AdminLeavePage.ts` — add `getRetryButton()`
- Create: `tests/cypress/e2e/leave-management/leave-management.cy.ts`

- [x] **Step 1: Branch off main**

  ```bash
  git checkout main
  git pull --ff-only origin main
  git checkout -b test/e2e-leave-management-spec
  ```

- [x] **Step 2: Add `FORM_END_DATE_ERROR` to `constants.ts`**

  ```typescript
  export const TEXTS = {
    MY_LEAVE: {
      EMPTY_STATE: 'No leave registered',
      ERROR_STATE: 'Something went wrong. Please try again.',
      FORM_START_DATE_ERROR: 'Start date must be today or in the future',
      FORM_END_DATE_ERROR: 'End date must be on or after the start date',
      FORM_OVERLAP_ERROR: 'You already have leave registered for part of this period.',
    },
    LEAVE_MANAGEMENT: {
      EMPTY_STATE: 'No leave registered',
      ERROR_STATE: 'Something went wrong. Please try again.',
      FORM_END_DATE_ERROR: 'End date must be on or after the start date',
      FORM_OVERLAP_ERROR: 'This employee already has leave registered for part of this period.',
    },
    CALENDAR: {
      ERROR_STATE: 'Something went wrong. Please try again.',
    },
    CONFIRMATION_DIALOG: {
      TITLE: 'Delete leave registration',
      MESSAGE: 'Are you sure you want to delete this leave registration? This action cannot be undone.',
      CONFIRM_LABEL: 'Delete',
      CANCEL_LABEL: 'Cancel',
    },
  } as const;
  ```

- [x] **Step 3: Add `getRetryButton()` to `AdminLeavePage.ts`**

  After `getErrorState()`, add:

  ```typescript
  static getRetryButton() {
    return cy.get(element('AdminLeave_RetryButton'));
  }
  ```

- [x] **Step 4: Commit support file changes**

  ```bash
  git add tests/cypress/support/constants.ts \
          tests/cypress/support/pages/AdminLeavePage.ts
  git commit -m "test(support): add leave management end-date error constant and retry button getter"
  ```

- [x] **Step 5: Write `leave-management.cy.ts`**

  ```typescript
  import SignInPage from '../../support/pages/SignInPage';
  import AdminLeavePage from '../../support/pages/AdminLeavePage';
  import LeaveForm from '../../support/pages/LeaveForm';
  import ConfirmationDialog from '../../support/pages/ConfirmationDialog';
  import {
    EMPLOYEE_ALICE_ADMIN,
    EMPLOYEE_EDDIE_EMPLOYEE,
    EMPLOYEE_NORA_NEWBIE,
  } from '../../support/testdata/employees';
  import { LEAVE_TYPE_VACATION, LEAVE_TYPE_PUBLIC_HOLIDAY } from '../../support/testdata/leaveTypes';
  import { TEXTS } from '../../support/constants';
  import { apiSignIn, apiAdminCreateLeave, apiCleanupAdminLeave } from '../../support/helpers/api';
  import { isoDate } from '../../support/helpers/dates';

  describe('Leave Management (Admin only)', () => {
    let adminToken: string;

    beforeEach(() => {
      apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then(
        (t) => {
          adminToken = t;
          apiCleanupAdminLeave(t);
        },
      );
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
      AdminLeavePage.visit();
    });

    afterEach(() => {
      if (adminToken) apiCleanupAdminLeave(adminToken);
    });

    // ── Table state ────────────────────────────────────────────────────────────

    describe('table state', () => {
      it('shows empty state when no records match active filters', () => {
        AdminLeavePage.checkEmptyState();
      });

      it('shows error state when API returns 500', () => {
        cy.intercept('GET', '/api/admin/leave*', { statusCode: 500 }).as('leaveError');
        AdminLeavePage.visit();
        cy.wait('@leaveError');
        AdminLeavePage.checkErrorState();
      });

      it('retry button reloads data after error', () => {
        cy.intercept('GET', '/api/admin/leave*', { statusCode: 500 }).as('leaveError');
        AdminLeavePage.visit();
        cy.wait('@leaveError');
        cy.intercept('GET', '/api/admin/leave*').as('leaveOk');
        AdminLeavePage.getRetryButton().click();
        cy.wait('@leaveOk');
        AdminLeavePage.checkEmptyState();
      });
    });

    // ── Create leave ───────────────────────────────────────────────────────────

    describe('create leave', () => {
      it('any employee, any leave type including Public Holiday → table refreshes', () => {
        AdminLeavePage.clickAddLeave();
        LeaveForm.get().should('be.visible');
        LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
        LeaveForm.fill({ leaveType: LEAVE_TYPE_PUBLIC_HOLIDAY, startDate: isoDate(7), endDate: isoDate(9) });
        LeaveForm.submit();
        LeaveForm.get().should('not.exist');
        AdminLeavePage.checkRowCount(1);
      });

      it('1-day leave (start == end) → succeeds', () => {
        const singleDay = isoDate(5);
        AdminLeavePage.clickAddLeave();
        LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: singleDay, endDate: singleDay });
        LeaveForm.submit();
        LeaveForm.get().should('not.exist');
        AdminLeavePage.checkRowCount(1);
      });

      it('end date before start date → END_DATE_ERROR below End Date field', () => {
        AdminLeavePage.clickAddLeave();
        LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(5) });
        LeaveForm.submit();
        LeaveForm.checkEndDateError(TEXTS.LEAVE_MANAGEMENT.FORM_END_DATE_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('overlap with existing → OVERLAP form-level error', () => {
        apiAdminCreateLeave(adminToken, {
          employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(5),
          endDate: isoDate(10),
        });
        AdminLeavePage.visit();
        AdminLeavePage.clickAddLeave();
        LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(12) });
        LeaveForm.submit();
        LeaveForm.checkFormError(TEXTS.LEAVE_MANAGEMENT.FORM_OVERLAP_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('leave starting the day an existing registration ends → OVERLAP (adjacency = overlap)', () => {
        apiAdminCreateLeave(adminToken, {
          employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(5),
          endDate: isoDate(10),
        });
        AdminLeavePage.visit();
        AdminLeavePage.clickAddLeave();
        LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
        // Start of new period == end of existing period — adjacency counts as overlap
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(10), endDate: isoDate(15) });
        LeaveForm.submit();
        LeaveForm.checkFormError(TEXTS.LEAVE_MANAGEMENT.FORM_OVERLAP_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('cancel closes form without saving', () => {
        AdminLeavePage.clickAddLeave();
        LeaveForm.get().should('be.visible');
        LeaveForm.cancel();
        LeaveForm.get().should('not.exist');
        AdminLeavePage.checkEmptyState();
      });
    });

    // ── Edit leave ─────────────────────────────────────────────────────────────

    describe('edit leave', () => {
      beforeEach(() => {
        // Admin can create leave with any date — including past dates
        apiAdminCreateLeave(adminToken, {
          employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(-30),
          endDate: isoDate(-28),
        });
        AdminLeavePage.visit();
      });

      it('edit for any employee — no date restriction for admin → table refreshes', () => {
        AdminLeavePage.clickEdit(0);
        LeaveForm.get().should('be.visible');
        LeaveForm.fillStartDate(isoDate(-60));
        LeaveForm.fillEndDate(isoDate(-58));
        LeaveForm.submit();
        LeaveForm.get().should('not.exist');
        AdminLeavePage.checkRowCount(1);
      });

      it('Employee field is locked to the original employee when editing', () => {
        AdminLeavePage.clickEdit(0);
        LeaveForm.getEmployeeSelect().should('be.disabled');
      });

      it('end date before start date → END_DATE_ERROR', () => {
        AdminLeavePage.clickEdit(0);
        LeaveForm.fillStartDate(isoDate(-30));
        LeaveForm.fillEndDate(isoDate(-35));
        LeaveForm.submit();
        LeaveForm.checkEndDateError(TEXTS.LEAVE_MANAGEMENT.FORM_END_DATE_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('cancel closes form without saving', () => {
        AdminLeavePage.clickEdit(0);
        LeaveForm.get().should('be.visible');
        LeaveForm.cancel();
        LeaveForm.get().should('not.exist');
        AdminLeavePage.checkRowCount(1);
      });
    });

    // ── Delete leave ───────────────────────────────────────────────────────────

    describe('delete leave', () => {
      beforeEach(() => {
        apiAdminCreateLeave(adminToken, {
          employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(7),
          endDate: isoDate(9),
        });
        AdminLeavePage.visit();
      });

      it('clicking delete opens Confirmation Dialog', () => {
        AdminLeavePage.clickDelete(0);
        ConfirmationDialog.checkVisible();
      });

      it('cancel closes dialog without deleting', () => {
        AdminLeavePage.clickDelete(0);
        ConfirmationDialog.clickCancel();
        ConfirmationDialog.checkNotExist();
        AdminLeavePage.checkRowCount(1);
      });

      it('confirm → registration deleted, table refreshes', () => {
        AdminLeavePage.clickDelete(0);
        ConfirmationDialog.clickConfirm();
        ConfirmationDialog.checkNotExist();
        AdminLeavePage.checkEmptyState();
      });
    });

    // ── Filters ────────────────────────────────────────────────────────────────

    describe('filters', () => {
      beforeEach(() => {
        apiAdminCreateLeave(adminToken, {
          employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(5),
          endDate: isoDate(7),
        });
        apiAdminCreateLeave(adminToken, {
          employeeId: EMPLOYEE_NORA_NEWBIE.id,
          leaveTypeId: LEAVE_TYPE_PUBLIC_HOLIDAY.id,
          startDate: isoDate(10),
          endDate: isoDate(12),
        });
        AdminLeavePage.visit();
      });

      it('filter by employee — shows only matching records', () => {
        AdminLeavePage.filterByEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
        AdminLeavePage.checkRowCount(1);
        AdminLeavePage.getRow(0).should('contain.text', EMPLOYEE_EDDIE_EMPLOYEE.name);
      });

      it('filter by leave type — shows only matching records', () => {
        AdminLeavePage.filterByType([LEAVE_TYPE_PUBLIC_HOLIDAY.name]);
        AdminLeavePage.checkRowCount(1);
        AdminLeavePage.getRow(0).should('contain.text', LEAVE_TYPE_PUBLIC_HOLIDAY.name);
      });

      it('filter by date range — shows only records within the range', () => {
        AdminLeavePage.filterByDateRange(isoDate(4), isoDate(8));
        AdminLeavePage.checkRowCount(1);
        AdminLeavePage.getRow(0).should('contain.text', EMPLOYEE_EDDIE_EMPLOYEE.name);
      });
    });

    // ── Pagination ─────────────────────────────────────────────────────────────

    describe('pagination', () => {
      it('prev button disabled on first page, next disabled when only one page exists', () => {
        AdminLeavePage.getPrevPage().should('be.disabled');
        AdminLeavePage.getNextPage().should('be.disabled');
      });
    });

    // ── Route guard ────────────────────────────────────────────────────────────

    describe('route guard', () => {
      it('Employee navigating to /admin/leave is redirected', () => {
        SignInPage.visit();
        SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
        cy.visit('/admin/leave');
        cy.url().should('not.include', '/admin/leave');
      });
    });
  });
  ```

- [x] **Step 6: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [x] **Step 7: Commit**

  ```bash
  git add tests/cypress/e2e/leave-management/leave-management.cy.ts
  git commit -m "test(leave-management): add Leave Management E2E spec"
  ```

- [x] **Step 8: Push, open PR, and squash-merge**

  ```bash
  git push -u origin test/e2e-leave-management-spec
  gh pr create --base main \
    --title "test(leave-management): add Leave Management E2E spec" \
    --body "Covers: empty/error/retry states, create (any type, 1-day, end<start, overlap, adjacency overlap, cancel), edit (no date restriction, employee locked, end<start, cancel), delete (dialog, cancel, confirm), filters (employee, type, date range), pagination, route guard for Employee role. Also adds FORM_END_DATE_ERROR constant and getRetryButton() getter. Blocked on frontend implementation — typecheck passes."
  gh pr view <n> --json mergeable,mergeStateStatus --jq '{mergeable,state:.mergeStateStatus}'
  gh pr merge <n> --squash --delete-branch
  ```

---

### Task 8: Security spec ✅ Done — PR #46

**Branch:** `test/e2e-security-spec`

**Files:**
- Create: `tests/cypress/e2e/security/security.cy.ts`

- [x] **Step 1: Branch off main**

  ```bash
  git checkout main
  git pull --ff-only origin main
  git checkout -b test/e2e-security-spec
  ```

- [x] **Step 2: Write `security.cy.ts`**

  ```typescript
  import SignInPage from '../../support/pages/SignInPage';
  import MyLeavePage from '../../support/pages/MyLeavePage';
  import { EMPLOYEE_EDDIE_EMPLOYEE, EMPLOYEE_NORA_NEWBIE } from '../../support/testdata/employees';
  import { LEAVE_TYPE_VACATION } from '../../support/testdata/leaveTypes';
  import { apiSignIn, apiCreateMyLeave, apiDeleteMyLeave } from '../../support/helpers/api';
  import { isoDate } from '../../support/helpers/dates';

  describe('Security (E2E smoke)', () => {
    it('unauthenticated user — all protected routes redirect to /sign-in', () => {
      ['/calendar', '/my-leave', '/admin/leave'].forEach((route) => {
        cy.visit(route);
        cy.url().should('include', '/sign-in');
      });
    });

    it('Employee-role user — navigating to /admin/leave is redirected by route guard', () => {
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      cy.visit('/admin/leave');
      cy.url().should('not.include', '/admin/leave');
    });

    it('Employee cannot see another employee\'s leave registrations on My Leave page', () => {
      let noraToken: string;
      let noraLeaveId: string;

      // Nora creates a leave registration
      apiSignIn(EMPLOYEE_NORA_NEWBIE.username, EMPLOYEE_NORA_NEWBIE.password).then((t) => {
        noraToken = t;
        apiCreateMyLeave(noraToken, {
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(7),
          endDate: isoDate(9),
        }).then((id) => { noraLeaveId = id; });
      });

      // Eddie signs in — My Leave shows only his own data (empty)
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      MyLeavePage.visit();
      MyLeavePage.checkEmptyState();

      // Clean up Nora's leave
      apiDeleteMyLeave(noraToken, noraLeaveId);
    });
  });
  ```

- [x] **Step 3: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [x] **Step 4: Commit**

  ```bash
  git add tests/cypress/e2e/security/security.cy.ts
  git commit -m "test(security): add security E2E smoke spec"
  ```

- [x] **Step 5: Push, open PR, and squash-merge**

  ```bash
  git push -u origin test/e2e-security-spec
  gh pr create --base main \
    --title "test(security): add security E2E smoke spec" \
    --body "Covers: unauthenticated redirect for all protected routes, Employee route guard for /admin/leave, Employee cannot see another employee's leave on My Leave. Blocked on frontend implementation — typecheck passes."
  gh pr view <n> --json mergeable,mergeStateStatus --jq '{mergeable,state:.mergeStateStatus}'
  gh pr merge <n> --squash --delete-branch
  ```

---

## PR sequence summary

| PR | Branch | Contents | Status |
|---|---|---|---|
| #38 | `docs/e2e-spec-implementation-plan` | plan.md fixes + this plan document | ✅ Merged |
| #40 | `test/e2e-types-and-helpers` | TestEmployee/TestLeaveType IDs + dates.ts + api.ts | ✅ Merged |
| #41 | `test/e2e-sign-in-spec` | `sign-in.cy.ts` | ✅ Merged |
| #42 | `test/e2e-nav-bar-spec` | `navigation-bar.cy.ts` | ✅ Merged |
| #43 | `test/e2e-calendar-spec` | `calendar-overview.cy.ts` | ✅ Merged |
| #44 | `test/e2e-my-leave-spec` | `my-leave.cy.ts` | ✅ Merged |
| #45 | `test/e2e-leave-management-spec` | `leave-management.cy.ts` + constants + AdminLeavePage | ✅ Merged |
| #46 | `test/e2e-security-spec` | `security.cy.ts` | ✅ Merged |
| #47 | `docs/update-e2e-plan-with-pr-status` | mark all tasks done, add PR numbers and implementation notes | ✅ Merged |
| #48 | `fix/cleanup-admin-leave-pagination` | fix `apiCleanupAdminLeave` to fetch all pages via `pageSize=1000` | ✅ Merged |
| #58 | `fix/cleanup-helper-pagesize-and-plan-notes` | fix `apiCleanupAdminLeave` pageSize to 100 (server max) + document `includeDemoUsers` risk in `plan.md` | ✅ Merged |
| #59 | `test/e2e-a11y-spec` | cypress-axe + axe-html-reporter setup, WCAG 2.2 AA spec for all 4 pages, `mocha/no-mocha-arrows` ESLint fix | ✅ Merged |
| #61 | `test/e2e-pom-getters` | POM getters for all FR gap-fill scenarios | ✅ Merged |
| #62 | `test/e2e-sign-in-gap-fill` | sign-in gap-fill: empty fields, root redirect | ✅ Merged |
| #63 | `test/e2e-security-gap-fill` | security gap-fill: post-sign-out routes, cross-employee isolation | ✅ Merged |
| #64 | `docs/plan-gap-fill-notes` | plan.md: gap-fill scenario notes | ✅ Merged |
| #65 | `test/e2e-calendar-gap-fill` | calendar gap-fill: admin access, two-employee chips, month fetch, leave chip name + description | ✅ Merged |
| #66 | `test/e2e-my-leave-gap-fill` | my-leave gap-fill: past-date buttons, today boundary, form field visibility, edit pre-fill, admin on /my-leave | ✅ Merged |
| #67 | `test/e2e-leave-management-gap-fill` | LM gap-fill: past dates, two-employee, adjacency, filter edge cases, pagination, route guard | ✅ Merged |
| #71 | `test/e2e-nav-bar-gap-fill` | nav bar gap-fill: admin name display, app logo link, visibility on /admin/leave | ✅ Merged |
| #72 | `test/e2e-confirmation-dialog-spec` | shared Confirmation Dialog spec (title, message, labels, backdrop) | ✅ Merged |
| #73 | `test/e2e-leave-type-badge-spec` | shared Leave Type Badge spec (visible in My Leave + LM rows, correct name) | ✅ Merged |
| #74 | `docs/plan-sync` | plan.md: current state table + known issues sync | ✅ Merged |
| #75 | `docs/plan-description-notes` | plan.md: fix FR column list (Description not Status) + description/notes scenarios | ✅ Merged |
| #76 | `test/e2e-pom-leavetype-error-legend` | POM: `getLeaveTypeError()` (LeaveForm) + `getLegend()` / `getLegendItem()` (CalendarPage) | ✅ Merged |
| #78 | `docs/plan-fr-gaps` | plan.md: legend, chip overflow, LM edit pre-fill scenarios; correct chip overflow categorisation | ✅ Merged |
| #79 | `test/e2e-specs-fr-gaps` | specs: TYPE_NOT_REGISTERABLE assertion, LM edit pre-fill, calendar legend tests | ✅ Merged |
| #80 | `test/e2e-pom-duration-pagination` | POM: `getDurationCell()` (MyLeave + AdminLeave) + `getPaginationLabel()` (AdminLeave) | ✅ Merged |
| #82 | `docs/plan-fr-gaps-2` | plan.md: duration column, sort order, pagination label, admin sign-out scenarios | ✅ Merged |
| #83 | `test/e2e-specs-fr-gaps-2` | specs: chip name assertion fix, duration, sort order, pagination label, admin sign-out | ✅ Merged |

Each task branches off the **merged** `main` from the previous task. Merge Task 2 before starting any spec task — all spec tasks depend on the helpers and IDs it introduces.

---

## Implementation notes

- **`apiDeleteMyLeave` / `apiAdminDeleteLeave` return type** — the plan had `Cypress.Chainable<void>` with `.then(() => undefined)`. TypeScript rejected this (`Chainable<Response<any>>` is not assignable to `Chainable<void>`). Fix applied: return type changed to `void`, `cy.request(...)` called without returning it. Cleanup callers (`apiCleanupMyLeave`, `apiCleanupAdminLeave`) are unaffected since they never use the return value.
- **Security spec cleanup** — `apiDeleteMyLeave` is called inside `cy.then(...)` to ensure Nora's token and leave ID are populated before the DELETE fires.
- **All specs typecheck-clean** — verified with `pnpm typecheck` in `tests/` before each PR was opened.

## Known limitations

- **Frontend dependency** — all specs fail at runtime until the frontend serves on `http://localhost:3000`. Run `pnpm typecheck` in `tests/` to verify TypeScript during spec authoring.
- **Timezone edge case** — `isoDate()` uses the test runner's local system date. Tests asserting "today" behaviour may behave unexpectedly near midnight Europe/Amsterdam time.
- ~~**TYPE_NOT_REGISTERABLE error text** — exact UI message comes from the frontend resource file; the Public Holiday test in Task 6 does not assert the text yet.~~ Fixed in PR #79: `LeaveForm.checkLeaveTypeError()` now asserts the error element is visible (FR does not specify the text; Design System wording noted in `tests/plan.md`).
- **AdminLeavePage `getRetryButton()`** — added in Task 7 with selector `AdminLeave_RetryButton`. Verify the `data-test` value against the rendered HTML once the frontend is built.
- ~~**`apiCleanupAdminLeave` pagination** — fetches page 1 only (default pageSize = 20).~~ Fixed in PR #48 (`pageSize=1000`), then corrected in PR #58 (`pageSize=100` — server enforces a maximum of 100).
- **`includeDemoUsers` requirement** — since PR #39, DbSeeder only seeds Alice/Eddie/Nora when `DbSeeder__IncludeDemoUsers=true` (or equivalent) is set. Documented in PR #58 and `tests/plan.md` known issues.
- **Accessibility spec (PR #59)** — merged; spec will pass once the frontend is implemented (same constraint as all other specs).
- **Frontend dependency** — all specs fail at runtime until the frontend serves on `http://localhost:3000` with `data-test` attributes in place. Run `pnpm typecheck` in `tests/` to verify TypeScript during spec authoring.
