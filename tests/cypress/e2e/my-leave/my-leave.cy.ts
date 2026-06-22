import SignInPage from '../../support/pages/SignInPage';
import MyLeavePage from '../../support/pages/MyLeavePage';
import LeaveForm from '../../support/pages/LeaveForm';
import ConfirmationDialog from '../../support/pages/ConfirmationDialog';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION, LEAVE_TYPE_PUBLIC_HOLIDAY } from '../../support/testdata/leaveTypes';
import { TEXTS } from '../../support/constants';
import { apiSignIn, apiAdminCreateLeave, apiCleanupAdminLeave, apiCreateMyLeave, apiCleanupMyLeave } from '../../support/helpers/api';
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
      cy.intercept('GET', '/api/me/leave').as('leaveOk');
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

    it('past start date → FORM_START_DATE_ERROR below Start Date field', () => {
      MyLeavePage.clickRegister();
      LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(-1), endDate: isoDate(1) });
      LeaveForm.submit();
      LeaveForm.checkStartDateError(TEXTS.MY_LEAVE.FORM_START_DATE_ERROR);
      LeaveForm.get().should('be.visible');
    });

    it('end date before start date → FORM_END_DATE_ERROR below End Date field', () => {
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
      // start of new period == end of existing period — adjacency counts as overlap per business rules
      LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(10), endDate: isoDate(15) });
      LeaveForm.submit();
      LeaveForm.checkFormError(TEXTS.MY_LEAVE.FORM_OVERLAP_ERROR);
      LeaveForm.get().should('be.visible');
    });

    it('restricted leave type (Public Holiday) → TYPE_NOT_REGISTERABLE error below Leave Type field', () => {
      MyLeavePage.clickRegister();
      LeaveForm.fill({ leaveType: LEAVE_TYPE_PUBLIC_HOLIDAY, startDate: isoDate(5), endDate: isoDate(7) });
      LeaveForm.submit();
      LeaveForm.checkLeaveTypeError();
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
      apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then(
        (t) => { adminToken = t; },
      );
    });

    afterEach(() => {
      if (adminToken) apiCleanupAdminLeave(adminToken);
    });

    it('buttons NOT visible on past-dated registrations', () => {
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(-7),
        endDate: isoDate(-5),
      });
      MyLeavePage.visit();
      MyLeavePage.checkEditButtonNotExist(0);
      MyLeavePage.checkDeleteButtonNotExist(0);
    });

    it('buttons NOT visible when start date is today — today is the boundary', () => {
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(0),
        endDate: isoDate(2),
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

  // ── Edit leave ───────────────────────────────────────────────────────────────

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
      MyLeavePage.getRow(0).should('contain.text', displayDate(startDate));
      MyLeavePage.getRow(0).should('contain.text', displayDate(endDate));
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
      LeaveForm.getLeaveTypeSelect()
        .should('not.contain.text', LEAVE_TYPE_PUBLIC_HOLIDAY.name);
    });
  });

  // ── Edit pre-fill ─────────────────────────────────────────────────────────────

  describe('edit pre-fill', () => {
    it('edit form is pre-populated with the existing registration values', () => {
      const startDate = isoDate(14);
      const endDate = isoDate(16);
      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate,
        endDate,
      });
      MyLeavePage.visit();
      MyLeavePage.clickEdit(0);
      LeaveForm.getLeaveTypeSelect().should('have.value', LEAVE_TYPE_VACATION.name);
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
      MyLeavePage.clickEdit(0);
      LeaveForm.getEmployeeSelect().should('not.exist');
      LeaveForm.cancel();
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
    });

    afterEach(() => {
      apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then((t) => {
        apiCleanupMyLeave(t);
      });
    });

    it('Admin can register their own leave via /my-leave', () => {
      MyLeavePage.clickRegister();
      LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(9) });
      LeaveForm.submit();
      LeaveForm.get().should('not.exist');
      MyLeavePage.checkRowCount(1);
    });
  });

});
