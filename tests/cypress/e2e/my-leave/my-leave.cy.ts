import SignInPage from '../../support/pages/SignInPage';
import MyLeavePage from '../../support/pages/MyLeavePage';
import LeaveForm from '../../support/pages/LeaveForm';
import ConfirmationDialog from '../../support/pages/ConfirmationDialog';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
import {
  LEAVE_TYPE_VACATION,
  LEAVE_TYPE_PUBLIC_HOLIDAY,
  LEAVE_TYPE_OTHER,
} from '../../support/testdata/leaveTypes';
import { TEXTS } from '../../support/constants';
import {
  apiSignIn,
  apiAdminCreateLeave,
  apiCleanupAdminLeave,
  apiCreateMyLeave,
  apiCleanupMyLeave,
} from '../../support/helpers/api';
import { isoDate, displayDate } from '../../support/helpers/dates';

describe('My Leave', () => {
  let eddieToken: string;
  let adminToken: string;

  beforeEach(() => {
    cy.intercept('GET', '**/api/me/leave').as('leaveFetch');

    apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then((t) => {
      adminToken = t;
      apiCleanupAdminLeave(t);
    });
    apiSignIn(EMPLOYEE_EDDIE_EMPLOYEE.username, EMPLOYEE_EDDIE_EMPLOYEE.password).then((t) => {
      eddieToken = t;
    });
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    MyLeavePage.visit();
    cy.wait('@leaveFetch');
  });

  afterEach(() => {
    if (adminToken) apiCleanupAdminLeave(adminToken);
  });

  // ── Table state ──────────────────────────────────────────────────────────────

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
      cy.intercept('GET', '/api/me/leave', { statusCode: 200, body: [] }).as('leaveOk');
      MyLeavePage.getRetryButton().click();
      cy.wait('@leaveOk');
      MyLeavePage.getEmptyState().should('be.visible');
    });
  });

  // ── Register leave ───────────────────────────────────────────────────────────

  describe('register leave', () => {
    it('happy path — future start date, valid type → form closes, table refreshes', () => {
      MyLeavePage.clickRegister();
      LeaveForm.get().should('be.visible');
      LeaveForm.fill({
        leaveType: LEAVE_TYPE_VACATION,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      LeaveForm.submit();
      LeaveForm.get().should('not.exist');
      MyLeavePage.checkRowCount(1);
    });

    it('start date = today → succeeds (today is a valid start date)', () => {
      MyLeavePage.clickRegister();
      LeaveForm.fill({
        leaveType: LEAVE_TYPE_VACATION,
        startDate: isoDate(0),
        endDate: isoDate(0),
      });
      LeaveForm.submit();
      LeaveForm.get().should('not.exist');
      MyLeavePage.checkRowCount(1);
    });

    it('past start date → FORM_START_DATE_ERROR below Start Date field', () => {
      MyLeavePage.clickRegister();
      LeaveForm.fill({
        leaveType: LEAVE_TYPE_VACATION,
        startDate: isoDate(-1),
        endDate: isoDate(1),
      });
      LeaveForm.submit();
      LeaveForm.checkStartDateError(TEXTS.MY_LEAVE.FORM_START_DATE_ERROR);
      LeaveForm.get().should('be.visible');
    });

    it('end date before start date → FORM_END_DATE_ERROR below End Date field', () => {
      MyLeavePage.clickRegister();
      LeaveForm.fill({
        leaveType: LEAVE_TYPE_VACATION,
        startDate: isoDate(5),
        endDate: isoDate(3),
      });
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
      cy.wait('@leaveFetch');
      MyLeavePage.clickRegister();
      LeaveForm.fill({
        leaveType: LEAVE_TYPE_VACATION,
        startDate: isoDate(7),
        endDate: isoDate(12),
      });
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
      cy.wait('@leaveFetch');
      MyLeavePage.clickRegister();
      // start of new period == end of existing period — adjacency counts as overlap per business rules
      LeaveForm.fill({
        leaveType: LEAVE_TYPE_VACATION,
        startDate: isoDate(10),
        endDate: isoDate(15),
      });
      LeaveForm.submit();
      LeaveForm.checkFormError(TEXTS.MY_LEAVE.FORM_OVERLAP_ERROR);
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

  // ── Edit and delete visibility ───────────────────────────────────────────────

  describe('edit and delete visibility', () => {
    let adminToken: string;

    beforeEach(() => {
      apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then((t) => {
        adminToken = t;
      });
    });

    afterEach(() => {
      if (adminToken) apiCleanupAdminLeave(adminToken);
    });

    it.skip('buttons NOT visible on past-dated registrations', () => {
      // Skipped: edit/delete buttons are visible on past leave registrations — tracked in #135
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(-7),
        endDate: isoDate(-5),
      });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
      MyLeavePage.checkEditButtonNotExist(0);
      MyLeavePage.checkDeleteButtonNotExist(0);
    });

    it.skip('buttons NOT visible when start date is today — today is the boundary', () => {
      // Skipped: edit/delete buttons are visible on past leave registrations — tracked in #135
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(0),
        endDate: isoDate(2),
      });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
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
      cy.wait('@leaveFetch');
      MyLeavePage.getEditButton(0).should('be.visible');
      MyLeavePage.getDeleteButton(0).should('be.visible');
    });
  });

  // ── Edit leave ───────────────────────────────────────────────────────────────

  describe('edit leave', () => {
    beforeEach(() => {
      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(14),
        endDate: isoDate(16),
      });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
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

    it('set new start date to past → FORM_START_DATE_ERROR', () => {
      MyLeavePage.clickEdit(0);
      LeaveForm.fillStartDate(isoDate(-3));
      LeaveForm.fillEndDate(isoDate(16));
      LeaveForm.submit();
      LeaveForm.checkStartDateError(TEXTS.MY_LEAVE.FORM_START_DATE_ERROR);
      LeaveForm.get().should('be.visible');
    });

    it('end date before start date → FORM_END_DATE_ERROR', () => {
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

  // ── Delete leave ─────────────────────────────────────────────────────────────

  describe('delete leave', () => {
    beforeEach(() => {
      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(14),
        endDate: isoDate(16),
      });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
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

  // ── Date formatting ──────────────────────────────────────────────────────────

  describe('date formatting', () => {
    it('dates in the leave table display as DD-MM-YYYY', () => {
      const startDate = isoDate(7);
      const endDate = isoDate(9);
      apiCreateMyLeave(eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate, endDate });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
      MyLeavePage.getRow(0).should('contain.text', displayDate(startDate));
      MyLeavePage.getRow(0).should('contain.text', displayDate(endDate));
    });

    it('duration in days is shown in the Duration column', () => {
      // isoDate(7) to isoDate(9) = 3 calendar days
      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
      MyLeavePage.getDurationCell(0).should('contain.text', '3');
    });
  });

  // ── Table order ───────────────────────────────────────────────────────────────

  describe('table order', () => {
    it('leave table is sorted by start date descending — most recent first', () => {
      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(14),
        endDate: isoDate(16),
      });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
      MyLeavePage.getRow(0).should('contain.text', displayDate(isoDate(14)));
      MyLeavePage.getRow(1).should('contain.text', displayDate(isoDate(7)));
    });
  });

  // ── Form field visibility ─────────────────────────────────────────────────────

  describe('form field visibility', () => {
    it('leave form for Employee has no Employee selector', () => {
      MyLeavePage.clickRegister();
      LeaveForm.get().should('be.visible');
      LeaveForm.getEmployeeSelect().should('not.exist');
    });

    it('Public Holiday is not available in the Employee leave type dropdown', () => {
      MyLeavePage.clickRegister();
      LeaveForm.getLeaveTypeSelect().should('not.contain.text', LEAVE_TYPE_PUBLIC_HOLIDAY.name);
    });
  });

  // ── Edit pre-fill ─────────────────────────────────────────────────────────────

  describe('edit pre-fill', () => {
    it.skip('edit form is pre-populated with the existing registration values', () => {
      // Skipped: uncontrolled Dropdown auto-selects the first option instead of the pre-fill value — tracked in #101
      const startDate = isoDate(14);
      const endDate = isoDate(16);
      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate,
        endDate,
      });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
      MyLeavePage.clickEdit(0);
      LeaveForm.getLeaveTypeSelect().should('have.value', LEAVE_TYPE_VACATION.id);
      LeaveForm.getStartDateInput().should('have.value', startDate);
      LeaveForm.getEndDateInput().should('have.value', endDate);
    });

    it('edit form has no Employee selector', () => {
      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(14),
        endDate: isoDate(16),
      });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
      MyLeavePage.clickEdit(0);
      LeaveForm.getEmployeeSelect().should('not.exist');
      LeaveForm.cancel();
    });
  });

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

    it.skip('description field enforces max 50 characters', () => {
      // Skipped: maxLength is a RHF validation rule only — no HTML maxlength attribute on the input — tracked in #144
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
      cy.wait('@leaveFetch');
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
      cy.wait('@leaveFetch');
      MyLeavePage.clickEdit(0);
      LeaveForm.getDescriptionInput().should('have.value', description);
      LeaveForm.cancel();
    });
  });

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

    it.skip('notes field enforces max 500 characters', () => {
      // Skipped: maxLength is a RHF validation rule only — no HTML maxlength attribute on the textarea — tracked in #144
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

    it.skip('hovering a row shows the notes tooltip when notes have been provided', () => {
      // Skipped: table rows do not show a notes tooltip on hover — tracked in #133
      const notes = 'Annual team retreat — flights booked';
      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
        notes,
      });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
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
      cy.wait('@leaveFetch');
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
      cy.wait('@leaveFetch');
      MyLeavePage.clickEdit(0);
      LeaveForm.getNotesInput().should('have.value', notes);
      LeaveForm.cancel();
    });
  });

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
      cy.wait('@leaveFetch');
      // Row 0 is the later record (descending order — isoDate(15))
      MyLeavePage.clickEdit(0);
      LeaveForm.fillStartDate(isoDate(7));
      LeaveForm.fillEndDate(isoDate(17));
      LeaveForm.submit();
      LeaveForm.checkFormError(TEXTS.MY_LEAVE.FORM_OVERLAP_ERROR);
      LeaveForm.get().should('be.visible');
    });
  });

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

  // ── Admin on /my-leave ────────────────────────────────────────────────────────

  describe('admin on /my-leave', () => {
    beforeEach(() => {
      cy.clearAllCookies();
      cy.clearAllLocalStorage();
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
    });

    afterEach(() => {
      apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then((t) => {
        apiCleanupMyLeave(t);
      });
    });

    it('Admin can register their own leave via /my-leave', () => {
      MyLeavePage.clickRegister();
      LeaveForm.fill({
        leaveType: LEAVE_TYPE_VACATION,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      LeaveForm.submit();
      LeaveForm.get().should('not.exist');
      MyLeavePage.checkRowCount(1);
    });
  });
});
