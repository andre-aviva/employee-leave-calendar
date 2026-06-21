# E2E Test Spec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write all Cypress E2E spec files covering the scenarios in `tests/plan.md`, covering Sign In, Navigation Bar, Calendar Overview, My Leave, Leave Management, and Security.

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
- Conventional Commits and GitHub Flow apply to every task
- **API date wire format is `YYYY-MM-DD`** (ISO) — `isoDate()` returns this format; `displayDate()` converts to DD-MM-YYYY for UI assertions

---

### Task 1: Update tests/plan.md with discovered scenario gaps

**Files:**
- Modify: `tests/plan.md`

Three issues discovered by cross-checking against the Confluence functional requirements and arc42 §10 quality tree:

1. **Navigation Bar — Admin scenario is wrong.** The Navigation Bar functional spec (Confluence) lists the My Leave link with **no role restriction**; only the Leave Management link is Admin-only. Admin users see: Calendar + My Leave + Leave Management. The current scenario "no My Leave link for Admin" follows the Design System, not the functional spec. The POM (`checkAdminLinks()`) is already correct.

2. **Three missing scenarios** called out as Critical/High in arc42 §10 quality tree:
   - 1-day leave `start == end` → must be accepted (Q1, Critical)
   - Adjacent period `end of A == start of B` → must be rejected as `OVERLAP` (Q1, Critical)
   - Dates display as `DD-MM-YYYY` in the UI (Q2, High)

3. **cypress-axe** is specified in AD-QA-1 as the accessibility tool — add as a known blocker note.

- [ ] **Step 1: Fix Nav Bar Admin scenario in the scenarios table**

  Change the Admin row in the "Navigation Bar" section from:
  ```
  | Admin | Sees Calendar Overview + Leave Management; no My Leave link |
  ```
  to:
  ```
  | Admin | Sees Calendar Overview + My Leave + Leave Management |
  ```

- [ ] **Step 2: Update the Design System additions table for Nav Bar**

  The Navigation Bar row currently says `checkAdminLinks() currently shows My Leave as visible`. Update the note to clarify that **the functional spec confirms My Leave is visible to Admin** — the POM is correct; it is the Design System that diverges:

  Change:
  ```
  | Navigation Bar — Admin role | Sees Calendar + Leave Management only; My Leave link hidden | `checkAdminLinks()` currently shows My Leave as visible |
  ```
  to:
  ```
  | Navigation Bar — Admin role | Sees Calendar + Leave Management only; My Leave link hidden | **Functional spec overrides Design System**: My Leave link has no role restriction per the Nav Bar spec page. `checkAdminLinks()` correctly shows My Leave as visible. Design System diverges — pending UX alignment. |
  ```

- [ ] **Step 3: Add 1-day leave scenario to My Leave**

  After the "Register — overlap with existing → OVERLAP form-level error" row, insert:
  ```
  | Employee | Register — 1-day leave (start == end) → succeeds |
  ```

- [ ] **Step 4: Add adjacent overlap scenario to My Leave**

  After the 1-day leave row, insert:
  ```
  | Employee | Register — leave starting the day an existing registration ends → OVERLAP error (adjacency counts as overlap) |
  ```

- [ ] **Step 5: Add DD-MM-YYYY format scenario to My Leave**

  At the end of the My Leave table, add:
  ```
  | Employee | Dates in the leave table display as DD-MM-YYYY |
  ```

- [ ] **Step 6: Add 1-day and adjacent overlap scenarios to Leave Management**

  After "Create — overlap → OVERLAP form-level error" in the Leave Management table, insert:
  ```
  | Admin | Create — 1-day leave (start == end) → succeeds |
  | Admin | Create — leave starting the day an existing registration ends → OVERLAP error |
  ```

- [ ] **Step 7: Add cypress-axe to Known Issues / Blockers**

  Add a new bullet:
  ```
  - **Accessibility (cypress-axe)** — AD-QA-1 specifies cypress-axe as the WCAG 2.2 AA accessibility tool. Not yet installed. Add once the frontend is implemented.
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add tests/plan.md
  git commit -m "docs(plan): fix nav bar admin scenario and add missing edge-case E2E scenarios"
  ```

---

### Task 2: Add seeded GUIDs to TestEmployee and TestLeaveType

**Files:**
- Modify: `tests/cypress/support/types/index.ts`
- Modify: `tests/cypress/support/testdata/employees.ts`
- Modify: `tests/cypress/support/testdata/leaveTypes.ts`

The GUIDs are fixed seeds from `src/backend/LeaveCalendar.Web/Infrastructure/Persistence/DbSeeder.cs`. Specs need them for `cy.request` API calls (`RegisterMyLeave.Request.LeaveTypeId`, `AdminCreateLeave.Request.EmployeeId`, etc.).

- [ ] **Step 1: Add `id: string` to both interfaces in `types/index.ts`**

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

- [ ] **Step 2: Populate IDs in `testdata/leaveTypes.ts`**

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

- [ ] **Step 3: Populate IDs in `testdata/employees.ts`**

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

- [ ] **Step 4: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add tests/cypress/support/types/index.ts \
          tests/cypress/support/testdata/employees.ts \
          tests/cypress/support/testdata/leaveTypes.ts
  git commit -m "test(types): add seeded GUIDs to TestEmployee and TestLeaveType"
  ```

---

### Task 3: Add date and API helpers

**Files:**
- Create: `tests/cypress/support/helpers/dates.ts`
- Create: `tests/cypress/support/helpers/api.ts`

- [ ] **Step 1: Create `helpers/dates.ts`**

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

- [ ] **Step 2: Create `helpers/api.ts`**

  `GET /api/admin/leave` returns a `PagedResult<AdminLeaveDto>` envelope `{ items: [...], page, pageSize, totalCount, totalPages }`. `GET /api/me/leave` returns a plain array. Both details are reflected in the helpers below.

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

- [ ] **Step 3: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add tests/cypress/support/helpers/dates.ts \
          tests/cypress/support/helpers/api.ts
  git commit -m "test(helpers): add date utilities and API seeding helpers"
  ```

---

### Task 4: Sign In spec

**Files:**
- Create: `tests/cypress/e2e/sign-in/sign-in.cy.ts`

- [ ] **Step 1: Write `sign-in.cy.ts`**

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

- [ ] **Step 2: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/cypress/e2e/sign-in/sign-in.cy.ts
  git commit -m "test(sign-in): add sign-in E2E spec"
  ```

---

### Task 5: Navigation Bar spec

**Files:**
- Create: `tests/cypress/e2e/navigation/navigation-bar.cy.ts`

Per the functional spec (Nav Bar page): My Leave link has no role restriction; Leave Management is Admin-only. Admin sees all three links. This aligns with `NavigationBar.checkAdminLinks()`.

- [ ] **Step 1: Write `navigation-bar.cy.ts`**

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

- [ ] **Step 2: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/cypress/e2e/navigation/navigation-bar.cy.ts
  git commit -m "test(nav): add navigation bar E2E spec"
  ```

---

### Task 6: Calendar Overview spec

**Files:**
- Create: `tests/cypress/e2e/calendar/calendar-overview.cy.ts`

The month-boundary test seeds a leave registration via the admin API and cleans it up in `afterEach`.

- [ ] **Step 1: Write `calendar-overview.cy.ts`**

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

- [ ] **Step 2: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/cypress/e2e/calendar/calendar-overview.cy.ts
  git commit -m "test(calendar): add calendar overview E2E spec"
  ```

---

### Task 7: My Leave spec

**Files:**
- Create: `tests/cypress/e2e/my-leave/my-leave.cy.ts`

`apiCleanupMyLeave` is called in both `beforeEach` (ensures clean state even if a previous test failed mid-cleanup) and `afterEach` (immediate tidy-up).

- [ ] **Step 1: Write `my-leave.cy.ts`**

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

    // ── Register leave ─���───────────────────────────────────────────────────────

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
        // Start of new period == end of existing period → adjacency counts as overlap per business rules
        LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(10), endDate: isoDate(15) });
        LeaveForm.submit();
        LeaveForm.checkFormError(TEXTS.MY_LEAVE.FORM_OVERLAP_ERROR);
        LeaveForm.get().should('be.visible');
      });

      it('restricted leave type (Public Holiday) → TYPE_NOT_REGISTERABLE error below Leave Type field', () => {
        MyLeavePage.clickRegister();
        LeaveForm.fill({ leaveType: LEAVE_TYPE_PUBLIC_HOLIDAY, startDate: isoDate(5), endDate: isoDate(7) });
        LeaveForm.submit();
        // Exact error text comes from the frontend resource file — verify against running app before asserting text
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

    // ── Edit leave ───────────────────────────��─────────────────────────────────

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

- [ ] **Step 2: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/cypress/e2e/my-leave/my-leave.cy.ts
  git commit -m "test(my-leave): add My Leave E2E spec"
  ```

---

### Task 8: Leave Management spec

**Files:**
- Modify: `tests/cypress/support/constants.ts` — add `FORM_END_DATE_ERROR` to `LEAVE_MANAGEMENT`
- Modify: `tests/cypress/support/pages/AdminLeavePage.ts` — add `getRetryButton()`
- Create: `tests/cypress/e2e/leave-management/leave-management.cy.ts`

- [ ] **Step 1: Add missing constant to `constants.ts`**

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

- [ ] **Step 2: Add `getRetryButton()` to `AdminLeavePage.ts`**

  In `AdminLeavePage.ts`, after `getErrorState()`, add:

  ```typescript
  static getRetryButton() {
    return cy.get(element('AdminLeave_RetryButton'));
  }
  ```

- [ ] **Step 3: Write `leave-management.cy.ts`**

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
  import {
    apiSignIn,
    apiAdminCreateLeave,
    apiCleanupAdminLeave,
  } from '../../support/helpers/api';
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
      it('prev button disabled on first page, next disabled when only one page', () => {
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

- [ ] **Step 4: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add tests/cypress/support/constants.ts \
          tests/cypress/support/pages/AdminLeavePage.ts \
          tests/cypress/e2e/leave-management/leave-management.cy.ts
  git commit -m "test(leave-management): add Leave Management E2E spec"
  ```

---

### Task 9: Security spec

**Files:**
- Create: `tests/cypress/e2e/security/security.cy.ts`

- [ ] **Step 1: Write `security.cy.ts`**

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

- [ ] **Step 2: Run typecheck**

  ```bash
  cd tests && pnpm typecheck
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/cypress/e2e/security/security.cy.ts
  git commit -m "test(security): add security E2E smoke spec"
  ```

---

## Self-Review

### Spec coverage

All scenarios from the updated `tests/plan.md` are covered:

| Group | Scenarios | Task |
|---|---|---|
| Sign In | 4 | Task 4 |
| Navigation Bar | 4 | Task 5 |
| Calendar Overview | 4 | Task 6 |
| My Leave — table state | 3 | Task 7 |
| My Leave — register (incl. 1-day, adjacency, DD-MM-YYYY) | 9 | Task 7 |
| My Leave — visibility | 2 | Task 7 |
| My Leave — edit | 5 | Task 7 |
| My Leave — delete | 3 | Task 7 |
| My Leave — date format | 1 | Task 7 |
| Leave Management — table state | 3 | Task 8 |
| Leave Management — create (incl. 1-day, adjacency) | 6 | Task 8 |
| Leave Management — edit | 4 | Task 8 |
| Leave Management — delete | 3 | Task 8 |
| Leave Management — filters | 3 | Task 8 |
| Leave Management — pagination | 1 | Task 8 |
| Leave Management — route guard | 1 | Task 8 |
| Security | 3 | Task 9 |

### Known limitations

- **Frontend dependency** — all specs fail at runtime until the frontend serves on `http://localhost:3000`. Use `pnpm typecheck` for verification during spec authoring.
- **Timezone edge case** — `isoDate()` uses the test runner's local system date. Tests asserting "today" behaviour may behave unexpectedly near midnight Europe/Amsterdam time. Run during Amsterdam daytime hours or add a buffer (e.g. use `isoDate(0)` only when the runner is in the same timezone).
- **TYPE_NOT_REGISTERABLE error text** — the exact UI message for a restricted leave type comes from the frontend `.resources.ts` file, which does not exist yet. The test in Task 7 does not assert the error text; add the assertion against `TEXTS` once the frontend is implemented and the wording is confirmed.
- **AdminLeavePage `getRetryButton()`** — added in Task 8. The `data-test` value `AdminLeave_RetryButton` is provisional; verify against the rendered HTML once the frontend is built.
- **Filter interactions** — filter tests assume filters are applied on change (as per the functional spec). If the frontend uses a submit-button pattern instead, update the filter test steps to submit after setting each filter.
- **`apiCleanupAdminLeave` pagination** — the cleanup helper fetches page 1 of the admin leave list (default pageSize = 20). If a test creates more than 20 records, the helper will not clean up all of them. Expand to iterate pages if needed.
