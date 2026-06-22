# Employee Leave Calendar — E2E Test Plan

## Reference docs (Confluence, ELC space)

**Functional requirements:**
- [Functional requirements](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143425) — overview
- Pages: [Sign In](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143453), [Base Layout](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143471), [Calendar Overview](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143497), [My Leave](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143523), [Leave Management](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143549)
- Components: [Navigation Bar](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143593), [Employee Leave Chip](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143619), [Leave Type Badge](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143637), [Confirmation Dialog](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143657)
- Data Model: [Employee](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143712), [Leave Registration](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143730), [Leave Type](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143750)

**Design System** (added 2026-06-18):
- [Design System](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/11337743) — overview
- [Page Layouts](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/11403266) — element composition per page
- [Feedback Patterns and Error States](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/10223818) — validation timing, loading, empty, success patterns
- [Component Library](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/11305126), [Accessibility](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/11337752), [Design Tokens](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/11239621)

**Architecture:**
- [System Architecture (arc42)](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/3506190) — includes E2E strategy (§10) and `data-test` convention
- [Backend Architecture](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/458756)

---

## Current state (as of 2026-06-22)

| Layer | Status |
|---|---|
| Backend: SignIn, GetCurrentUser, ListLeaveTypes, ListEmployees, ViewCalendar, ListMyLeave, RegisterMyLeave, EditMyLeave, DeleteMyLeave | Done |
| Backend: ListAllLeave, AdminCreateLeave, AdminEditLeave, AdminDeleteLeave | Done (#12, #13) |
| Frontend | **Not yet implemented** — blocks all E2E tests |
| Cypress scaffold (`tests/`) | In place: pnpm, TypeScript, cypress-real-events, cypress-terminal-report, cypress-axe, axe-html-reporter, POM skill |
| E2E specs | **Written and merged** (#41–#46) — all scenarios below are covered; specs will pass once the frontend is implemented and `data-test` attributes are in place |
| Accessibility suite | **Open PR #59** — WCAG 2.2 AA checks on all 4 pages via cypress-axe; violations logged to terminal and written to `cypress/reports/a11y/a11y-report.html` |

---

## Seeded test data

| Name | Username | Password | Role |
|---|---|---|---|
| Alice Admin | admin | Admin!123 | Admin |
| Eddie Employee | employee | Employee!123 | Employee |
| Nora Newbie | nora | Employee!123 | Employee |

| Leave type | Registerable by | Colour |
|---|---|---|
| Vacation | Employee, Admin | #2E7D32 |
| Sick Leave | Employee, Admin | #C62828 |
| Public Holiday | Admin only | #1565C0 |
| Other | Employee, Admin | #6A1B9A |

---

## Routes and role access

| Route | Page | Accessible to |
|---|---|---|
| `/` | Redirects → `/calendar` (auth) or `/sign-in` (unauth) | — |
| `/sign-in` | Sign In | Public |
| `/calendar` | Calendar Overview | Employee, Admin |
| `/my-leave` | My Leave | Employee, Admin |
| `/admin/leave` | Leave Management | Admin only |

---

## Business rules (drive test design)

1. **No overlap** per employee — all four write slices; adjacency (end of A == start of B) counts as overlap
2. **End date >= start date** always; 1-day leave has start == end
3. **Employee self-service**: only employee-registerable types (Vacation, Sick Leave, Other); only edit/delete own registrations with a **future** start date (today is not editable/deletable)
4. **Employee new leave**: start date must be today or future (Europe/Amsterdam)
5. **Admin**: rules 3 and 4 do not apply — any date, any leave type, any employee
6. **Ownership**: employees can only read/write their own leave; `/api/me/leave` scopes to the caller's EmployeeId

---

## E2E selector convention

`data-test` naming pattern: `[Component]_[Element]`

| Element | `data-test` value |
|---|---|
| Sign In — username input | `SignIn_UsernameInput` |
| Sign In — submit button | `SignIn_SubmitButton` |
| My Leave — register button | `MyLeave_RegisterButton` |
| My Leave — table row (repeating) | `MyLeave_TableRow` |
| Confirmation Dialog | `ConfirmationDialog` |

Rules: `data-test` is never used in CSS or application logic; repeating elements carry it on the repeating element, not the container; reusable components use one consistent value.

---

## UI strings — error, empty, and success messages

**Important:** The functional requirements and the Design System Feedback Patterns page use different wording for the same states. The implemented text depends on what the frontend developer put in `.resources.ts` files. Verify against the running app before asserting exact strings in tests.

### Validation errors

| Error | Functional spec text | Design system text | Placement |
|---|---|---|---|
| Start date in past | "Start date must be today or in the future" | "The start date cannot be in the past." | Below Start Date field |
| My Leave overlap | "You already have leave registered for part of this period." | "You already have a leave request for this period. Please choose different dates." | Form-level panel above submit |
| Leave Management overlap | "This employee already has leave registered for part of this period." | — | Form-level panel |
| End date before start | "End date must be on or after the start date" | — | Below End Date field |
| Type not registerable | — | "This leave type cannot be requested. Please select a different type." | Below Leave Type field |

API 422 error code → placement (Design System):
- `OVERLAP` → form-level error panel (above submit button)
- `START_DATE_IN_PAST` → below the Start Date field
- `TYPE_NOT_REGISTERABLE` → below the Leave Type field

### Empty state messages

| Context | Functional spec | Design system |
|---|---|---|
| My Leave — no registrations | "No leave registered" | "You have not submitted any leave requests yet." |
| My Leave — filter with no results | — | "No leave requests match your current filters." |
| Leave Management — no registrations | "No leave registered" | "No leave requests found." |
| Leave Management — filter no results | — | "No leave requests match the selected filters." |
| Any page — data load failure | "Something went wrong. Please try again." | — (same pattern) |

### Success states (Design System)

| Action | Treatment |
|---|---|
| Leave request submitted | Dialog closes; toast top-right: green background, check icon, "Leave request submitted." Auto-dismisses after 4 seconds; also has a manual dismiss (×) button. |
| Leave request cancelled (My Leave) | Confirmation Dialog closes; row status updates to "Cancelled" inline. No toast. |
| Leave approved / rejected (admin) | Confirmation Dialog closes; row status updates inline. No toast. |

### Confirmation Dialog strings

| Field | Value |
|---|---|
| Title | "Delete leave registration" |
| Message | "Are you sure you want to delete this leave registration? This action cannot be undone." |
| Confirm button | "Delete" |
| Cancel button | "Cancel" |

Clicking the backdrop does **not** close the dialog.

---

## UX behaviour relevant to tests (Design System)

- Field validation errors appear **on blur** (after leaving a field), not while typing
- On form submission, all invalid fields show errors simultaneously
- Submit button shows a spinner and becomes non-interactive during async submission
- Table data loading: skeleton rows shown (not a spinner)
- Calendar loading: skeleton cells inside grid cells
- Row actions (future: Approve/Reject/Cancel): the clicked button shows a spinner; all other action buttons on the same row are disabled until the action completes
- One primary action per form — never more than one primary button visible at once

---

## Navigation bar — role-based links (Design System)

| Role | Links shown |
|---|---|
| Employee | Calendar Overview, My Leave |
| Admin | Calendar Overview, Leave Management |

Signed-in user name displayed on the right alongside the sign-out control.

---

## Page layout notes (E2E-relevant)

**Calendar Overview** (`/calendar`):
- "Request Leave" button top-right — **visible to Employee only, not to Admin**
- Month navigation (← label →) above the calendar grid

**My Leave** (`/my-leave`):
- "Request Leave" button top-right
- FilterBar: Type | Status | Year | Reset
- Table columns: Leave Type, Start Date, End Date, Days, Status, Actions
- Actions column: edit/delete (functional spec) only visible on future-dated registrations

**Leave Management** (`/admin/leave`):
- Add leave button top-right above table
- FilterBar: Employee (searchable dropdown) | Type | Status | Date range (From/To) | Reset
- Table columns: Employee, Leave Type, Start Date, End Date, Days, Status, Actions
- Changing a filter resets the table to page 1; 20 records per page

---

## Design System additions not yet in POMs — pending UX alignment

The items below appear in the Design System (Page Layouts / Feedback Patterns) but **not** in the functional requirements. POMs currently follow the functional requirements only. Confirm with UX team before adding.

| Feature | Design System says | POM status |
|---|---|---|
| Calendar Overview — "Request Leave" button | Visible to Employee only, not to Admin | Not in `CalendarPage` |
| Navigation Bar — Admin role | Sees Calendar + Leave Management only; My Leave link hidden | **Functional spec overrides Design System**: My Leave link has no role restriction per the Nav Bar functional spec. `checkAdminLinks()` correctly shows My Leave as visible for Admin. Design System diverges — pending UX alignment. |
| My Leave — success feedback | Toast top-right after register/edit, auto-dismisses after 4s | No `SuccessToast` getter in `MyLeavePage` |
| Leave Management — filter bar | Includes Status filter | No `getStatusFilter()` in `AdminLeavePage` |
| Leave Management — filter bar | Includes Reset button | No `getResetButton()` / `resetFilters()` in `AdminLeavePage` |
| Leave type colours | Each leave type has a colour (chip + badge) | `colour` removed from `TestLeaveType` and test data — add back once design finalises the hex values |
| My Leave — FilterBar | Filters: Type \| Status \| Year \| Reset | No filter methods in `MyLeavePage`; functional spec has no filters on My Leave |
| My Leave — Pagination | Paginated table (same pattern as Leave Management) | No pagination getters in `MyLeavePage`; functional spec has no pagination on My Leave |
| My Leave — Status column | Table columns include Status; Description column removed | `MyLeavePage` POM reflects functional spec columns (no Status) |
| Leave Management — Status column | Table columns include Status; Description column removed | `AdminLeavePage` POM reflects functional spec columns (no Status) |
| Leave Type field error | `TYPE_NOT_REGISTERABLE` → "This leave type cannot be requested." below Leave Type field | `getLeaveTypeError()` removed from `LeaveForm` — add back if Design System is adopted |
| Sign In — field name | Design System: "Email field"; functional spec implies username | `SignIn_UsernameInput` selector may need renaming to `SignIn_EmailInput` |

---

## DISCREPANCY — Design System vs Functional Requirements

The Design System Page Layouts page introduces a status concept and approval workflow not present in the functional requirements. These conflict on My Leave and Leave Management actions:

| Feature | Functional Requirements | Design System |
|---|---|---|
| My Leave actions | Edit + Delete (future-dated registrations only) | Cancel button (Pending requests only) |
| Leave Management actions | Add + Edit + Delete | Approve + Reject (Pending requests only) |
| Leave statuses | Not mentioned | Pending, Approved, Rejected, Cancelled |

The backend currently has **no Approve or Reject slices**. Until resolved, write E2E scenarios against the functional requirements (Edit/Delete model). Confirm the intended approach with the team before implementing My Leave and Leave Management specs.

---

## Page objects to build (once frontend exists)

- [x] `SignInPage`
- [x] `NavigationBar` (shared — visible on every authenticated page)
- [x] `CalendarPage`
- [x] `MyLeavePage`
- [x] `LeaveForm` (shared modal — used by My Leave register/edit)
- [x] `ConfirmationDialog` (shared — used by delete on My Leave and Leave Management)
- [x] `AdminLeavePage` (blocks on admin slices being implemented)

**TODO (post-frontend):** Once the frontend is implemented, verify all `data-test` selectors in the POMs against the actual rendered HTML and update any that don't match before writing specs.

---

## E2E test scenarios

### Sign In

| Persona | Scenario |
|---|---|
| Any | Happy path — valid credentials → redirected to /calendar |
| Any | Wrong credentials → error shown on page |
| Any | Already signed in → navigating to /sign-in redirects to /calendar |
| Any | Unauthenticated → navigating to any protected page redirects to /sign-in |

### Navigation Bar

| Persona | Scenario |
|---|---|
| Employee | Sees Calendar Overview + My Leave; no Leave Management link |
| Admin | Sees Calendar Overview + My Leave + Leave Management |
| Any | Signed-in user's name displayed in the nav bar |
| Any | Sign out → redirected to /sign-in |

### Calendar Overview

| Persona | Scenario |
|---|---|
| Employee, Admin | Month navigation — previous/next month loads correct data |
| Employee, Admin | Multi-day leave spanning a month boundary shows in both months |
| Employee, Admin | Empty month — all day cells render, no leave chips |
| Employee, Admin | Error state — retry button reloads data |

### My Leave

| Persona | Scenario |
|---|---|
| Employee | Empty state shown when no registrations exist |
| Employee | Error state — retry button reloads data |
| Employee | Register — happy path (future start date, valid type) → form closes, table refreshes |
| Employee | Register — start date = today → succeeds (today is a valid start date) |
| Employee | Register — past start date → START_DATE_IN_PAST error below Start Date field |
| Employee | Register — end date before start date → END_DATE_ERROR below End Date field |
| Employee | Register — overlap with existing → OVERLAP form-level error |
| Employee | Register — 1-day leave (start == end) → succeeds |
| Employee | Register — leave starting the day an existing registration ends → OVERLAP error (adjacency counts as overlap) |
| Employee | Register — restricted leave type (Public Holiday) → TYPE_NOT_REGISTERABLE error below Leave Type field |
| Employee | Register — Cancel closes form without saving |
| Employee | Edit and delete actions only visible on registrations with a **future** start date — not visible on today-dated or past-dated registrations |
| Employee | Edit — happy path (future registration) → form closes, table refreshes |
| Employee | Edit — set new start date to today → succeeds (today is a valid new start date) |
| Employee | Edit — set new start date to a past date → START_DATE_IN_PAST error below Start Date field |
| Employee | Edit — end date before start date → END_DATE_ERROR below End Date field |
| Employee | Edit — Cancel closes form without saving |
| Employee | Delete — Confirmation Dialog appears; Cancel closes without deleting |
| Employee | Delete — Confirm → registration deleted, table refreshes |
| Employee | Dates in the leave table display as DD-MM-YYYY |
| Admin | Same register/edit/delete flows (Admin also uses My Leave for own leave) |

### Leave Management (Admin only)

| Persona | Scenario |
|---|---|
| Admin | Empty state shown when no records match active filters |
| Admin | Error state — retry button reloads data |
| Admin | Create leave for any employee, any leave type including Public Holiday → table refreshes |
| Admin | Create — end date before start date → END_DATE_ERROR below End Date field |
| Admin | Create — overlap → OVERLAP form-level error |
| Admin | Create — 1-day leave (start == end) → succeeds |
| Admin | Create — leave starting the day an existing registration ends → OVERLAP error (adjacency counts as overlap) |
| Admin | Create — Cancel closes form without saving |
| Admin | Edit leave for any employee — no date restriction → table refreshes |
| Admin | Edit — Employee field is locked to the original employee |
| Admin | Edit — end date before start date → END_DATE_ERROR below End Date field |
| Admin | Edit — Cancel closes form without saving |
| Admin | Delete — Confirmation Dialog appears; Cancel closes without deleting |
| Admin | Delete — Confirm → registration deleted, table refreshes |
| Admin | Overlap check still applies for admin create/edit → OVERLAP error |
| Admin | Filtering by employee, type, date range |
| Admin | Pagination — 20 records per page; changing a filter resets to page 1 |
| Employee | Navigating to /admin/leave → redirected (route guard) |

### Security (E2E smoke)

| Scenario |
|---|
| Unauthenticated user → redirect to /sign-in for all protected routes |
| Employee-role user → /admin/leave redirected by frontend route guard |
| Employee cannot see or interact with another employee's leave on My Leave page |

---

## Known issues / blockers

- ~~**Bug** [#14](https://github.com/andre-aviva/employee-leave-calendar/issues/14): employee can edit/delete leave starting today~~ — fixed in #19.
- ~~**Admin slices not yet implemented**~~ — resolved in #12; all four admin slices (`ListAllLeave`, `AdminCreateLeave`, `AdminEditLeave`, `AdminDeleteLeave`) are implemented and integration-tested.
- **Frontend not yet implemented** — blocks all E2E tests. Specs are written and merged; they will run once the frontend serves on `http://localhost:3000` and `data-test` attributes are in place.
- **Accessibility (cypress-axe)** — AD-QA-1 specifies cypress-axe as the WCAG 2.2 AA accessibility tool. Not yet installed. Add once the frontend is implemented.
- **Design System vs functional spec discrepancy** — see discrepancy section; confirm approval workflow intent with team before writing specs.
- **Error message wording** — functional spec and Design System differ; verify exact strings against running frontend before asserting in tests.
- `cypress.config.ts` baseUrl is `http://localhost:3000` (placeholder — update once dev server port is confirmed).
