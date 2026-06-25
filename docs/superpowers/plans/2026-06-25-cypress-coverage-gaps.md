# Cypress Coverage Gaps — Implementation Plan

> **Status: ✅ Complete** — all 31 actionable gaps closed and merged through PRs #91–#96. Gap 6 (chip initials fallback) intentionally deferred. See `tests/plan.md` for the live scenario inventory and known CI risks.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 31 identified gaps between the Functional Requirements and the Cypress E2E test suite, covering form inputs, validation constraints, table display, hover tooltips, badge rendering for all four leave types, navigation, calendar chip behaviour, and API-level access control.

**Architecture:** All changes are confined to the Cypress test layer (`tests/`). No application code is modified. If a test fails because a `data-test` attribute is missing from the app, that is a finding to triage separately — do not change app code; leave a comment in the spec noting the gap. POM classes are extended with new accessor methods where needed; no new page-object files are created.

**Tech Stack:** Cypress 15, TypeScript, `cypress-real-events` (hover; already installed), POM classes in `tests/cypress/support/pages/`, helpers in `tests/cypress/support/helpers/`.

## Global Constraints

- Never add a `Co-Authored-By` trailer to any commit message.
- Branch off an up-to-date `main` as `test/cypress-coverage-gaps` before touching any file.
- Commit after every task: `test(<scope>): <imperative summary>` (Conventional Commits).
- Never add custom Cypress commands (`Cypress.Commands.add`). Extend POM classes only.
- All selectors use the `element()` helper (`[data-test="..."]`). Never select by CSS class or element tag alone.
- Run commands execute from the `tests/` directory: `pnpm headless --spec "cypress/e2e/<path>"`.
- Gap 6 (employee initials fallback) is intentionally out of scope — requires a dedicated test employee engineered to trigger chip truncation, which is beyond current test-data setup.

---

## Files Modified

| File | Change |
|---|---|
| `tests/cypress/support/constants.ts` | Add `FORM_LEAVE_TYPE_ERROR`, `FORM_DESCRIPTION_MAX_CHARS`, `FORM_NOTES_MAX_CHARS` constants |
| `tests/cypress/support/pages/LeaveForm.ts` | Add `getNotesCharCounter()` |
| `tests/cypress/support/pages/MyLeavePage.ts` | Add `getDescriptionCell(index)` |
| `tests/cypress/support/pages/AdminLeavePage.ts` | Add `getDescriptionCell(index)` |
| `tests/cypress/support/pages/CalendarPage.ts` | Add `getTodayCell()` |
| `tests/cypress/e2e/my-leave/my-leave.cy.ts` | Add 11 tests across 5 new/extended describe blocks |
| `tests/cypress/e2e/leave-management/leave-management.cy.ts` | Add 11 tests across 4 new/extended describe blocks |
| `tests/cypress/e2e/shared/leave-type-badge.cy.ts` | Add 3 tests for Sick Leave, Public Holiday, Other badges |
| `tests/cypress/e2e/navigation/navigation-bar.cy.ts` | Add 3 tests for link click navigation |
| `tests/cypress/e2e/calendar/calendar-overview.cy.ts` | Add 4 tests for chip gaps + today highlight |
| `tests/cypress/e2e/security/security.cy.ts` | Add 5 API-level access-control tests |

---

### Task 1: Infrastructure — POM accessors + constants

Adds the accessor methods and text constants all subsequent tasks depend on. Nothing is tested in this task; it is pure scaffolding that must land first.

**Files:**
- Modify: `tests/cypress/support/constants.ts`
- Modify: `tests/cypress/support/pages/LeaveForm.ts`
- Modify: `tests/cypress/support/pages/MyLeavePage.ts`
- Modify: `tests/cypress/support/pages/AdminLeavePage.ts`
- Modify: `tests/cypress/support/pages/CalendarPage.ts`

- [ ] **Step 1: Add constants**

In `tests/cypress/support/constants.ts`, add the following keys. `FORM_LEAVE_TYPE_ERROR` is discovered in Task 9 Step 1; leave it as an empty string for now — it will be filled in during Task 9.

```typescript
export const TEXTS = {
  MY_LEAVE: {
    EMPTY_STATE: 'No leave registered',
    ERROR_STATE: 'Something went wrong. Please try again.',
    FORM_START_DATE_ERROR: 'Start date must be today or in the future',
    FORM_END_DATE_ERROR: 'End date must be on or after the start date',
    FORM_OVERLAP_ERROR: 'You already have leave registered for part of this period.',
    FORM_LEAVE_TYPE_ERROR: '', // filled in Task 9
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

- [ ] **Step 2: Add `getNotesCharCounter()` to LeaveForm**

In `tests/cypress/support/pages/LeaveForm.ts`, add after `getNotesInput()`:

```typescript
static getNotesCharCounter() {
  return cy.get(element('LeaveForm_NotesCharCounter'));
}
```

- [ ] **Step 3: Add `getDescriptionCell()` to MyLeavePage**

In `tests/cypress/support/pages/MyLeavePage.ts`, add after `getDurationCell()`:

```typescript
static getDescriptionCell(index: number) {
  return cy.get(element('MyLeave_TableRow')).eq(index).find(element('MyLeave_DescriptionCell'));
}
```

- [ ] **Step 4: Add `getDescriptionCell()` to AdminLeavePage**

In `tests/cypress/support/pages/AdminLeavePage.ts`, add after `getDurationCell()`:

```typescript
static getDescriptionCell(index: number) {
  return cy.get(element('AdminLeave_TableRow')).eq(index).find(element('AdminLeave_DescriptionCell'));
}
```

- [ ] **Step 5: Add `getTodayCell()` to CalendarPage**

In `tests/cypress/support/pages/CalendarPage.ts`, add after `getDayCells()`:

```typescript
static getTodayCell() {
  return cy.get(element('CalendarGrid_DayCell')).filter('[data-today]');
}
```

- [ ] **Step 6: Typecheck**

```
cd tests && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```
git add tests/cypress/support/constants.ts tests/cypress/support/pages/LeaveForm.ts tests/cypress/support/pages/MyLeavePage.ts tests/cypress/support/pages/AdminLeavePage.ts tests/cypress/support/pages/CalendarPage.ts
git commit -m "test(support): add POM accessors and constants for coverage-gap tests"
```

---

### Task 2: My Leave — Description field (form input, table display, edit pre-fill)

Covers gaps 7, 8, 12, and the Description part of gap 14.

**Files:**
- Modify: `tests/cypress/e2e/my-leave/my-leave.cy.ts`

- [ ] **Step 1: Add `// ── Description field ──` section to `my-leave.cy.ts`**

Add the following block at the end of the file, before the closing `});` of the top-level `describe`:

```typescript
// ── Description field ────────────────────────────────────────────────────────

describe('description field', () => {
  it('description is optional — form submits and table refreshes when description is filled', () => {
    MyLeavePage.clickRegister();
    LeaveForm.fill({
      leaveType: LEAVE_TYPE_VACATION,
      startDate: isoDate(7),
      endDate: isoDate(9),
      description: 'Beach holiday',
    });
    LeaveForm.submit();
    LeaveForm.get().should('not.exist');
    MyLeavePage.checkRowCount(1);
  });

  it('description field enforces max 50 characters', () => {
    MyLeavePage.clickRegister();
    LeaveForm.fillDescription('a'.repeat(51));
    LeaveForm.getDescriptionInput().should('have.value', 'a'.repeat(50));
    LeaveForm.cancel();
  });

  it('description is shown in the Description column of the table', () => {
    const description = 'Summer vacation';
    apiCreateMyLeave(eddieToken, {
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(7),
      endDate: isoDate(9),
      description,
    });
    MyLeavePage.visit();
    MyLeavePage.getDescriptionCell(0).should('contain.text', description);
  });

  it('edit form is pre-populated with description', () => {
    const description = 'Beach holiday';
    apiCreateMyLeave(eddieToken, {
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(14),
      endDate: isoDate(16),
      description,
    });
    MyLeavePage.visit();
    MyLeavePage.clickEdit(0);
    LeaveForm.getDescriptionInput().should('have.value', description);
    LeaveForm.cancel();
  });
});
```

- [ ] **Step 2: Run and observe**

```
cd tests && pnpm headless --spec "cypress/e2e/my-leave/my-leave.cy.ts"
```

Expected: the four new tests pass. If `getDescriptionCell` fails with "element not found", the app is missing `data-test="MyLeave_DescriptionCell"` — log this as a finding and comment out that test with `it.skip(...)`.

- [ ] **Step 3: Commit**

```
git add tests/cypress/e2e/my-leave/my-leave.cy.ts
git commit -m "test(my-leave): add description form field, table display, and edit pre-fill tests"
```

---

### Task 3: My Leave — Notes field (form input, max chars, character counter, row tooltip)

Covers gaps 9, 10, 11, 13, and the Notes part of gap 14.

**Files:**
- Modify: `tests/cypress/e2e/my-leave/my-leave.cy.ts`

- [ ] **Step 1: Add `// ── Notes field ──` section**

Add the following block after the description field block from Task 2:

```typescript
// ── Notes field ──────────────────────────────────────────────────────────────

describe('notes field', () => {
  it('notes is optional — form submits and table refreshes when notes are filled', () => {
    MyLeavePage.clickRegister();
    LeaveForm.fill({
      leaveType: LEAVE_TYPE_VACATION,
      startDate: isoDate(7),
      endDate: isoDate(9),
      notes: 'Doctor appointment — need to leave by 3pm',
    });
    LeaveForm.submit();
    LeaveForm.get().should('not.exist');
    MyLeavePage.checkRowCount(1);
  });

  it('notes field enforces max 500 characters', () => {
    MyLeavePage.clickRegister();
    LeaveForm.fillNotes('a'.repeat(501));
    LeaveForm.getNotesInput().should('have.value', 'a'.repeat(500));
    LeaveForm.cancel();
  });

  it('notes character counter reflects the number of characters typed', () => {
    MyLeavePage.clickRegister();
    LeaveForm.fillNotes('a'.repeat(400));
    LeaveForm.getNotesCharCounter().should('contain.text', '400');
    LeaveForm.cancel();
  });

  it('hovering a row shows the notes tooltip when notes have been provided', () => {
    const notes = 'Annual team retreat — flights booked';
    apiCreateMyLeave(eddieToken, {
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(7),
      endDate: isoDate(9),
      notes,
    });
    MyLeavePage.visit();
    MyLeavePage.getRow(0).realHover();
    cy.get('[role="tooltip"]').should('contain.text', notes);
  });

  it('hovering a row with no notes does not show a tooltip', () => {
    apiCreateMyLeave(eddieToken, {
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(7),
      endDate: isoDate(9),
      // notes intentionally omitted
    });
    MyLeavePage.visit();
    MyLeavePage.getRow(0).realHover();
    cy.get('[role="tooltip"]').should('not.exist');
  });

  it('edit form is pre-populated with notes', () => {
    const notes = 'Need to book flights in advance';
    apiCreateMyLeave(eddieToken, {
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(14),
      endDate: isoDate(16),
      notes,
    });
    MyLeavePage.visit();
    MyLeavePage.clickEdit(0);
    LeaveForm.getNotesInput().should('have.value', notes);
    LeaveForm.cancel();
  });
});
```

- [ ] **Step 2: Run and observe**

```
cd tests && pnpm headless --spec "cypress/e2e/my-leave/my-leave.cy.ts"
```

Expected: all new tests pass. If the tooltip tests fail with "element not found", the app may not render a `[role="tooltip"]` element — log as a finding and use `it.skip(...)`.

- [ ] **Step 3: Commit**

```
git add tests/cypress/e2e/my-leave/my-leave.cy.ts
git commit -m "test(my-leave): add notes field, max chars, character counter, and row tooltip tests"
```

---

### Task 4: My Leave — Edit overlap + Other leave type

Covers gaps 15 and 16.

**Files:**
- Modify: `tests/cypress/e2e/my-leave/my-leave.cy.ts`

- [ ] **Step 1: Add import for `LEAVE_TYPE_OTHER`**

At the top of `my-leave.cy.ts`, extend the existing leave-type import:

```typescript
import { LEAVE_TYPE_VACATION, LEAVE_TYPE_PUBLIC_HOLIDAY, LEAVE_TYPE_OTHER } from '../../support/testdata/leaveTypes';
```

- [ ] **Step 2: Add edit-overlap describe block**

Add after the existing `// ── Edit — overlap validation ──` section (or create it if it does not exist):

```typescript
// ── Edit — overlap validation ─────────────────────────────────────────────────

describe('edit — overlap validation', () => {
  it('editing a registration to overlap an existing one for the same employee → OVERLAP error', () => {
    apiCreateMyLeave(eddieToken, {
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(5),
      endDate: isoDate(9),
    });
    apiCreateMyLeave(eddieToken, {
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(15),
      endDate: isoDate(19),
    });
    MyLeavePage.visit();
    // Row 0 is the later record (descending order — isoDate(15))
    MyLeavePage.clickEdit(0);
    LeaveForm.fillStartDate(isoDate(7));
    LeaveForm.fillEndDate(isoDate(17));
    LeaveForm.submit();
    LeaveForm.checkFormError(TEXTS.MY_LEAVE.FORM_OVERLAP_ERROR);
    LeaveForm.get().should('be.visible');
  });
});
```

- [ ] **Step 3: Add Other leave type describe block**

Add a new describe block:

```typescript
// ── Other leave type ──────────────────────────────────────────────────────────

describe('Other leave type', () => {
  it('Other leave type is available in the Employee leave type dropdown', () => {
    MyLeavePage.clickRegister();
    LeaveForm.getLeaveTypeSelect().should('contain.text', LEAVE_TYPE_OTHER.name);
    LeaveForm.cancel();
  });

  it('Other leave type is registerable by Employee — form submits and table refreshes', () => {
    MyLeavePage.clickRegister();
    LeaveForm.fill({
      leaveType: LEAVE_TYPE_OTHER,
      startDate: isoDate(7),
      endDate: isoDate(9),
    });
    LeaveForm.submit();
    LeaveForm.get().should('not.exist');
    MyLeavePage.checkRowCount(1);
  });
});
```

- [ ] **Step 4: Run and observe**

```
cd tests && pnpm headless --spec "cypress/e2e/my-leave/my-leave.cy.ts"
```

Expected: all three new tests pass.

- [ ] **Step 5: Commit**

```
git add tests/cypress/e2e/my-leave/my-leave.cy.ts
git commit -m "test(my-leave): add edit-overlap and Other leave type coverage"
```

---

### Task 5: Leave Management — Description field (form input, table display, edit pre-fill)

Covers gaps 17, 18, and 22.

**Files:**
- Modify: `tests/cypress/e2e/leave-management/leave-management.cy.ts`

- [ ] **Step 1: Add `// ── Description field ──` section**

Add at the end of `leave-management.cy.ts`, before the closing `});`:

```typescript
// ── Description field ────────────────────────────────────────────────────────

describe('description field', () => {
  it('description is optional — form submits and table refreshes when description is filled', () => {
    AdminLeavePage.clickAddLeave();
    LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
    LeaveForm.fill({
      leaveType: LEAVE_TYPE_VACATION,
      startDate: isoDate(7),
      endDate: isoDate(9),
      description: 'Beach holiday',
    });
    LeaveForm.submit();
    LeaveForm.get().should('not.exist');
    AdminLeavePage.checkRowCount(1);
  });

  it('description field enforces max 50 characters', () => {
    AdminLeavePage.clickAddLeave();
    LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
    LeaveForm.fillDescription('a'.repeat(51));
    LeaveForm.getDescriptionInput().should('have.value', 'a'.repeat(50));
    LeaveForm.cancel();
  });

  it('description is shown in the Description column of the Admin table', () => {
    const description = 'Parental leave';
    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(7),
      endDate: isoDate(9),
      description,
    });
    AdminLeavePage.visit();
    AdminLeavePage.getDescriptionCell(0).should('contain.text', description);
  });

  it('edit form is pre-populated with description', () => {
    const description = 'Parental leave';
    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(-30),
      endDate: isoDate(-28),
      description,
    });
    AdminLeavePage.visit();
    AdminLeavePage.clickEdit(0);
    LeaveForm.getDescriptionInput().should('have.value', description);
    LeaveForm.cancel();
  });
});
```

- [ ] **Step 2: Run and observe**

```
cd tests && pnpm headless --spec "cypress/e2e/leave-management/leave-management.cy.ts"
```

Expected: all four new tests pass. If `getDescriptionCell` fails with element not found, the app is missing `data-test="AdminLeave_DescriptionCell"` — mark with `it.skip(...)` and log as a finding.

- [ ] **Step 3: Commit**

```
git add tests/cypress/e2e/leave-management/leave-management.cy.ts
git commit -m "test(leave-management): add description form field, table display, and edit pre-fill tests"
```

---

### Task 6: Leave Management — Notes field (form input, max chars, character counter, row tooltip)

Covers gaps 19, 20, 21, and 23.

**Files:**
- Modify: `tests/cypress/e2e/leave-management/leave-management.cy.ts`

- [ ] **Step 1: Add `// ── Notes field ──` section**

Add after the description field block from Task 5:

```typescript
// ── Notes field ──────────────────────────────────────────────────────────────

describe('notes field', () => {
  it('notes is optional — Admin form submits and table refreshes when notes are filled', () => {
    AdminLeavePage.clickAddLeave();
    LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
    LeaveForm.fill({
      leaveType: LEAVE_TYPE_VACATION,
      startDate: isoDate(7),
      endDate: isoDate(9),
      notes: 'Approved by HR — ref #4521',
    });
    LeaveForm.submit();
    LeaveForm.get().should('not.exist');
    AdminLeavePage.checkRowCount(1);
  });

  it('notes field enforces max 500 characters in the Admin form', () => {
    AdminLeavePage.clickAddLeave();
    LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
    LeaveForm.fillNotes('a'.repeat(501));
    LeaveForm.getNotesInput().should('have.value', 'a'.repeat(500));
    LeaveForm.cancel();
  });

  it('notes character counter reflects the number of characters typed in the Admin form', () => {
    AdminLeavePage.clickAddLeave();
    LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
    LeaveForm.fillNotes('a'.repeat(350));
    LeaveForm.getNotesCharCounter().should('contain.text', '350');
    LeaveForm.cancel();
  });

  it('hovering an Admin table row shows the notes tooltip when notes have been provided', () => {
    const notes = 'HR approved — see ticket #8801';
    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(7),
      endDate: isoDate(9),
      notes,
    });
    AdminLeavePage.visit();
    AdminLeavePage.getRow(0).realHover();
    cy.get('[role="tooltip"]').should('contain.text', notes);
  });

  it('hovering an Admin table row with no notes does not show a tooltip', () => {
    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(7),
      endDate: isoDate(9),
      // notes intentionally omitted
    });
    AdminLeavePage.visit();
    AdminLeavePage.getRow(0).realHover();
    cy.get('[role="tooltip"]').should('not.exist');
  });

  it('edit form is pre-populated with notes', () => {
    const notes = 'Approved by manager';
    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(-30),
      endDate: isoDate(-28),
      notes,
    });
    AdminLeavePage.visit();
    AdminLeavePage.clickEdit(0);
    LeaveForm.getNotesInput().should('have.value', notes);
    LeaveForm.cancel();
  });
});
```

- [ ] **Step 2: Run and observe**

```
cd tests && pnpm headless --spec "cypress/e2e/leave-management/leave-management.cy.ts"
```

Expected: all six new tests pass.

- [ ] **Step 3: Commit**

```
git add tests/cypress/e2e/leave-management/leave-management.cy.ts
git commit -m "test(leave-management): add notes field, max chars, character counter, and row tooltip tests"
```

---

### Task 7: Leave Management — functional gaps (date range filter empty state, pagination total pages, Other leave type)

Covers gaps 24, 25, and 26.

**Files:**
- Modify: `tests/cypress/e2e/leave-management/leave-management.cy.ts`

- [ ] **Step 1: Add date range filter empty state test to existing `describe('filters')` block**

Locate the existing `describe('filters', () => {` block in `leave-management.cy.ts`. Add as the last `it` inside that block:

```typescript
it('date range filter with no matching records shows empty state', () => {
  // The beforeEach already seeds records at isoDate(5) and isoDate(10).
  // Filter to a range that excludes both.
  AdminLeavePage.filterByDateRange(isoDate(20), isoDate(25));
  AdminLeavePage.checkEmptyState();
});
```

- [ ] **Step 2: Add pagination total-pages test to existing `describe('pagination')` block**

Locate the existing `describe('pagination', () => {` block. Add as a new `it` inside that block:

```typescript
it('pagination label shows the total page count alongside the current page', () => {
  const employees = [EMPLOYEE_EDDIE_EMPLOYEE, EMPLOYEE_NORA_NEWBIE, EMPLOYEE_ALICE_ADMIN];
  for (let i = 0; i < 21; i++) {
    const emp = employees[i % employees.length];
    apiAdminCreateLeave(adminToken, {
      employeeId: emp.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(i + 1),
      endDate: isoDate(i + 1),
    });
  }
  AdminLeavePage.visit();
  // 21 records at page size 20 → 2 pages total. The label must show both.
  AdminLeavePage.getPaginationLabel().should('contain.text', '1'); // current page
  AdminLeavePage.getPaginationLabel().should('contain.text', '2'); // total pages
});
```

- [ ] **Step 3: Add Other leave type section**

Add a new describe block after `// ── Route guard ──`:

```typescript
// ── Other leave type ──────────────────────────────────────────────────────────

describe('Other leave type', () => {
  it('Admin can create leave for any employee using the Other leave type', () => {
    AdminLeavePage.clickAddLeave();
    LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
    LeaveForm.fill({
      leaveType: LEAVE_TYPE_OTHER,
      startDate: isoDate(7),
      endDate: isoDate(9),
    });
    LeaveForm.submit();
    LeaveForm.get().should('not.exist');
    AdminLeavePage.checkRowCount(1);
  });
});
```

- [ ] **Step 4: Add `LEAVE_TYPE_OTHER` to the import at the top of `leave-management.cy.ts`**

```typescript
import { LEAVE_TYPE_VACATION, LEAVE_TYPE_PUBLIC_HOLIDAY, LEAVE_TYPE_OTHER } from '../../support/testdata/leaveTypes';
```

- [ ] **Step 5: Run and observe**

```
cd tests && pnpm headless --spec "cypress/e2e/leave-management/leave-management.cy.ts"
```

Expected: all new tests pass.

- [ ] **Step 6: Commit**

```
git add tests/cypress/e2e/leave-management/leave-management.cy.ts
git commit -m "test(leave-management): add date range filter empty state, pagination total pages, and Other leave type"
```

---

### Task 8: Leave Type Badge — Sick Leave, Public Holiday, Other

Covers gaps 27, 28, and 29.

**Files:**
- Modify: `tests/cypress/e2e/shared/leave-type-badge.cy.ts`

- [ ] **Step 1: Add imports**

At the top of `leave-type-badge.cy.ts`, extend the leave-type import:

```typescript
import {
  LEAVE_TYPE_VACATION,
  LEAVE_TYPE_SICK_LEAVE,
  LEAVE_TYPE_PUBLIC_HOLIDAY,
  LEAVE_TYPE_OTHER,
} from '../../support/testdata/leaveTypes';
```

Also add `apiCreateMyLeave` and `apiCleanupMyLeave` if not already imported (they are — check existing imports).

- [ ] **Step 2: Add Sick Leave and Other badge tests to the existing `My Leave table row` describe block**

Inside `describe('My Leave table row', () => {`, add two new `it` blocks after the existing Vacation test:

```typescript
it('Sick Leave badge is visible and shows the correct leave type name', () => {
  apiCleanupMyLeave(eddieToken);
  apiCreateMyLeave(eddieToken, {
    leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
    startDate: isoDate(7),
    endDate: isoDate(9),
  });
  MyLeavePage.visit();
  MyLeavePage.getLeaveTypeBadge(0).should('be.visible');
  MyLeavePage.getLeaveTypeBadge(0).should('contain.text', LEAVE_TYPE_SICK_LEAVE.name);
});

it('Other badge is visible and shows the correct leave type name', () => {
  apiCleanupMyLeave(eddieToken);
  apiCreateMyLeave(eddieToken, {
    leaveTypeId: LEAVE_TYPE_OTHER.id,
    startDate: isoDate(7),
    endDate: isoDate(9),
  });
  MyLeavePage.visit();
  MyLeavePage.getLeaveTypeBadge(0).should('be.visible');
  MyLeavePage.getLeaveTypeBadge(0).should('contain.text', LEAVE_TYPE_OTHER.name);
});
```

- [ ] **Step 3: Add Public Holiday badge test to the existing `Leave Management table row` describe block**

Inside `describe('Leave Management table row', () => {`, add after the existing Vacation test:

```typescript
it('Public Holiday badge is visible and shows the correct leave type name', () => {
  apiCleanupAdminLeave(adminToken);
  apiAdminCreateLeave(adminToken, {
    employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
    leaveTypeId: LEAVE_TYPE_PUBLIC_HOLIDAY.id,
    startDate: isoDate(5),
    endDate: isoDate(7),
  });
  AdminLeavePage.visit();
  AdminLeavePage.getLeaveTypeBadge(0).should('be.visible');
  AdminLeavePage.getLeaveTypeBadge(0).should('contain.text', LEAVE_TYPE_PUBLIC_HOLIDAY.name);
});
```

- [ ] **Step 4: Check the `apiCleanupAdminLeave` import is present** (it already is — verify at top of file).

- [ ] **Step 5: Run and observe**

```
cd tests && pnpm headless --spec "cypress/e2e/shared/leave-type-badge.cy.ts"
```

Expected: all three new tests pass.

- [ ] **Step 6: Commit**

```
git add tests/cypress/e2e/shared/leave-type-badge.cy.ts
git commit -m "test(leave-type-badge): add Sick Leave, Public Holiday, and Other badge tests"
```

---

### Task 9: Leave type error message — discover exact text and assert it

Covers gap 30. The FR specifies that submitting a leave form with a leave type not registerable by the employee produces a validation error below the Leave Type field. The existing test only checks visibility. This task discovers the exact message, adds it to constants, and tightens the assertion.

**Files:**
- Modify: `tests/cypress/support/constants.ts`
- Modify: `tests/cypress/e2e/my-leave/my-leave.cy.ts`

- [ ] **Step 1: Run the discovery snippet to capture the actual error message**

Temporarily add this test to `my-leave.cy.ts` inside the `describe('register leave')` block:

```typescript
it('[DISCOVERY] capture leave type error message text', () => {
  MyLeavePage.clickRegister();
  LeaveForm.fill({ leaveType: LEAVE_TYPE_PUBLIC_HOLIDAY, startDate: isoDate(5), endDate: isoDate(7) });
  LeaveForm.submit();
  LeaveForm.getLeaveTypeError().invoke('text').then((text) => {
    cy.log('Leave type error message:', text.trim());
  });
});
```

Run:

```
cd tests && pnpm headless --spec "cypress/e2e/my-leave/my-leave.cy.ts"
```

Open the Cypress log or terminal output and copy the value logged by `cy.log`.

- [ ] **Step 2: Fill in the constant**

In `tests/cypress/support/constants.ts`, replace the empty `FORM_LEAVE_TYPE_ERROR` string with the discovered message:

```typescript
FORM_LEAVE_TYPE_ERROR: '<paste exact message from Step 1>',
```

- [ ] **Step 3: Remove the discovery test and tighten the existing assertion**

Remove the `[DISCOVERY]` test added in Step 1.

In the existing `it('restricted leave type (Public Holiday) → TYPE_NOT_REGISTERABLE error below Leave Type field')` test, replace:

```typescript
LeaveForm.checkLeaveTypeError();
```

with:

```typescript
LeaveForm.getLeaveTypeError().should('contain.text', TEXTS.MY_LEAVE.FORM_LEAVE_TYPE_ERROR);
```

- [ ] **Step 4: Run and verify**

```
cd tests && pnpm headless --spec "cypress/e2e/my-leave/my-leave.cy.ts"
```

Expected: all tests pass including the updated leave-type-error test.

- [ ] **Step 5: Commit**

```
git add tests/cypress/support/constants.ts tests/cypress/e2e/my-leave/my-leave.cy.ts
git commit -m "test(my-leave): assert exact leave type error message text"
```

---

### Task 10: Navigation Bar — link click navigation

Covers gap 1. The POM already has `clickCalendar()`, `clickMyLeave()`, and `clickLeaveManagement()` — none are called in any spec.

**Files:**
- Modify: `tests/cypress/e2e/navigation/navigation-bar.cy.ts`

- [ ] **Step 1: Add three new tests**

Add the following `it` blocks to the existing `describe('Navigation Bar')`:

```typescript
it('Calendar Overview link navigates to /calendar', () => {
  SignInPage.visit();
  SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
  cy.visit('/my-leave'); // start somewhere else
  NavigationBar.clickCalendar();
  cy.url().should('include', '/calendar');
});

it('My Leave link navigates to /my-leave', () => {
  SignInPage.visit();
  SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
  // /calendar is the landing page after sign-in
  NavigationBar.clickMyLeave();
  cy.url().should('include', '/my-leave');
});

it('Leave Management link navigates to /admin/leave (Admin only)', () => {
  SignInPage.visit();
  SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
  NavigationBar.clickLeaveManagement();
  cy.url().should('include', '/admin/leave');
});
```

- [ ] **Step 2: Run and observe**

```
cd tests && pnpm headless --spec "cypress/e2e/navigation/navigation-bar.cy.ts"
```

Expected: all three new tests pass.

- [ ] **Step 3: Commit**

```
git add tests/cypress/e2e/navigation/navigation-bar.cy.ts
git commit -m "test(navigation-bar): add link click navigation tests"
```

---

### Task 11: Calendar Overview — chip behavioral gaps

Covers gaps 2 (today highlighted), 3 (overflow indicator), 4 (no description → name only), and 5 (chip notes tooltip).

**Files:**
- Modify: `tests/cypress/e2e/calendar/calendar-overview.cy.ts`

- [ ] **Step 1: Add tests for chip without description and with notes tooltip**

Add the following blocks inside the existing `describe('Calendar Overview')`:

```typescript
it('chip with no description shows only the employee name — no description text is rendered', () => {
  apiAdminCreateLeave(adminToken, {
    employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
    leaveTypeId: LEAVE_TYPE_VACATION.id,
    startDate: isoDate(8),
    endDate: isoDate(8),
    // description intentionally omitted
  }).then((id) => createdIds.push(id));

  CalendarPage.visit();
  const firstName = EMPLOYEE_EDDIE_EMPLOYEE.name.split(' ')[0];
  CalendarPage.getLeaveChips().first().within(() => {
    cy.contains(firstName).should('be.visible');
  });
  // There should be no second line of text (no description element)
  CalendarPage.getLeaveChips().first().find(element('EmployeeLeaveChip_Description')).should('not.exist');
});

it('hovering a chip shows the notes tooltip when notes have been provided', () => {
  const notes = 'Annual team retreat — pre-booked';
  apiAdminCreateLeave(adminToken, {
    employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
    leaveTypeId: LEAVE_TYPE_VACATION.id,
    startDate: isoDate(9),
    endDate: isoDate(9),
    notes,
  }).then((id) => createdIds.push(id));

  CalendarPage.visit();
  CalendarPage.getLeaveChips().first().realHover();
  cy.get('[role="tooltip"]').should('contain.text', notes);
});

it('hovering a chip with no notes does not show a tooltip', () => {
  apiAdminCreateLeave(adminToken, {
    employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
    leaveTypeId: LEAVE_TYPE_VACATION.id,
    startDate: isoDate(10),
    endDate: isoDate(10),
    // notes intentionally omitted
  }).then((id) => createdIds.push(id));

  CalendarPage.visit();
  CalendarPage.getLeaveChips().first().realHover();
  cy.get('[role="tooltip"]').should('not.exist');
});
```

- [ ] **Step 2: Add the today-highlighted test**

```typescript
it('today\'s date cell is visually highlighted', () => {
  CalendarPage.visit();
  // Exactly one day cell should be marked as today
  CalendarPage.getTodayCell().should('have.length', 1);
});
```

- [ ] **Step 3: Add the overflow-indicator test**

```typescript
it('day cell shows an overflow indicator when registrations exceed the visible chip limit', () => {
  const sameDay = isoDate(11);
  // Seed all three test employees on the same day to maximise chip count
  [EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE, EMPLOYEE_NORA_NEWBIE].forEach((emp) => {
    apiAdminCreateLeave(adminToken, {
      employeeId: emp.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: sameDay,
      endDate: sameDay,
    }).then((id) => createdIds.push(id));
  });

  CalendarPage.visit();
  // If the visible-chip threshold is ≤ 3, an overflow indicator will exist.
  // If this assertion fails, the threshold is > 3 — triage with the team to agree
  // on a test approach (e.g. add more test employees or adjust the threshold).
  cy.get('[data-test$="Overflow"]').should('exist');
});
```

- [ ] **Step 4: Add `element` import to `calendar-overview.cy.ts`** (needed for `element('EmployeeLeaveChip_Description')`):

At the top of the file add:

```typescript
import { element } from '../../support/helpers/element';
```

- [ ] **Step 5: Run and observe**

```
cd tests && pnpm headless --spec "cypress/e2e/calendar/calendar-overview.cy.ts"
```

Expected: today-highlighted and no-description tests pass. The tooltip and overflow tests may fail if the app is missing the relevant elements — mark failing tests with `it.skip(...)` and log as findings.

- [ ] **Step 6: Commit**

```
git add tests/cypress/e2e/calendar/calendar-overview.cy.ts
git commit -m "test(calendar-overview): add chip no-description, notes tooltip, today highlight, and overflow tests"
```

---

### Task 12: Security — API-level access control for main leave endpoints

Covers gaps 31 and 32. Mirrors the pattern already established in `audit-trail.cy.ts`.

**Files:**
- Modify: `tests/cypress/e2e/security/security.cy.ts`

- [ ] **Step 1: Add imports**

At the top of `security.cy.ts`, extend the existing imports:

```typescript
import { apiSignIn } from '../../support/helpers/api';
import { LEAVE_TYPE_VACATION } from '../../support/testdata/leaveTypes';
import { isoDate } from '../../support/helpers/dates';
```

(Skip any that are already imported.)

- [ ] **Step 2: Add API access-control describe block**

Add at the end of `security.cy.ts`, inside the top-level `describe`:

```typescript
// ── API access control — main leave endpoints ─────────────────────────────────

describe('API access control — main leave endpoints', () => {
  let eddieApiToken: string;

  before(() => {
    apiSignIn(EMPLOYEE_EDDIE_EMPLOYEE.username, EMPLOYEE_EDDIE_EMPLOYEE.password).then((t) => {
      eddieApiToken = t;
    });
  });

  it('GET /api/me/leave — unauthenticated returns 401', () => {
    cy.request({ method: 'GET', url: '/api/me/leave', failOnStatusCode: false })
      .its('status').should('equal', 401);
  });

  it('POST /api/me/leave — unauthenticated returns 401', () => {
    cy.request({
      method: 'POST',
      url: '/api/me/leave',
      body: {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      },
      failOnStatusCode: false,
    }).its('status').should('equal', 401);
  });

  it('GET /api/admin/leave — unauthenticated returns 401', () => {
    cy.request({ method: 'GET', url: '/api/admin/leave', failOnStatusCode: false })
      .its('status').should('equal', 401);
  });

  it('GET /api/admin/leave — employee-role token returns 403', () => {
    cy.request({
      method: 'GET',
      url: '/api/admin/leave',
      headers: { Authorization: `Bearer ${eddieApiToken}` },
      failOnStatusCode: false,
    }).its('status').should('equal', 403);
  });

  it('POST /api/admin/leave — employee-role token returns 403', () => {
    cy.request({
      method: 'POST',
      url: '/api/admin/leave',
      headers: { Authorization: `Bearer ${eddieApiToken}` },
      body: {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      },
      failOnStatusCode: false,
    }).its('status').should('equal', 403);
  });
});
```

- [ ] **Step 3: Run and observe**

```
cd tests && pnpm headless --spec "cypress/e2e/security/security.cy.ts"
```

Expected: all five new tests pass.

- [ ] **Step 4: Commit**

```
git add tests/cypress/e2e/security/security.cy.ts
git commit -m "test(security): add API-level 401/403 access control tests for main leave endpoints"
```

---

## Self-Review

**Spec coverage check — all 31 gaps mapped to tasks:**

| Gap | Task |
|---|---|
| 1 — Nav links not click-tested | Task 10 |
| 2 — Today's date highlighted | Task 11 |
| 3 — Chip overflow indicator | Task 11 |
| 4 — Chip no description → name only | Task 11 |
| 5 — Chip notes tooltip | Task 11 |
| 6 — Chip initials fallback | **Deferred** (out of scope) |
| 7 — My Leave description field never filled | Task 2 |
| 8 — My Leave description max 50 | Task 2 |
| 9 — My Leave notes field never filled | Task 3 |
| 10 — My Leave notes max 500 | Task 3 |
| 11 — My Leave notes char counter | Task 3 |
| 12 — My Leave description in table | Task 2 |
| 13 — My Leave notes tooltip | Task 3 |
| 14 — My Leave edit pre-fill desc + notes | Tasks 2 + 3 |
| 15 — My Leave edit overlap | Task 4 |
| 16 — My Leave Other leave type | Task 4 |
| 17 — Admin description field never filled | Task 5 |
| 18 — Admin description max 50 | Task 5 |
| 19 — Admin notes field never filled | Task 6 |
| 20 — Admin notes max 500 | Task 6 |
| 21 — Admin notes char counter | Task 6 |
| 22 — Admin description in table | Task 5 |
| 23 — Admin notes tooltip | Task 6 |
| 24 — Date range filter empty state | Task 7 |
| 25 — Pagination total page count | Task 7 |
| 26 — Admin Other leave type | Task 7 |
| 27 — Sick Leave badge | Task 8 |
| 28 — Public Holiday badge | Task 8 |
| 29 — Other badge | Task 8 |
| 30 — Leave type error message text | Task 9 |
| 31 — API /api/me/leave unauthenticated 401 | Task 12 |
| 32 — API /api/admin/leave employee 403 | Task 12 |
