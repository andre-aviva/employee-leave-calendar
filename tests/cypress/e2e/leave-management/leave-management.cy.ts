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
import { isoDate, displayDate } from '../../support/helpers/dates';

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

  // ── Table state ──────────────────────────────────────────────────────────────

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

  // ── Create leave ─────────────────────────────────────────────────────────────

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

    it('end date before start date → FORM_END_DATE_ERROR below End Date field', () => {
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
      // start of new period == end of existing period — adjacency counts as overlap
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

    it('Admin can create leave with a past start date', () => {
      AdminLeavePage.clickAddLeave();
      LeaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(-14), endDate: isoDate(-12) });
      LeaveForm.submit();
      LeaveForm.get().should('not.exist');
      AdminLeavePage.checkRowCount(1);
    });

    it('two different employees can have overlapping dates — no overlap error', () => {
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(10),
      });
      AdminLeavePage.visit();
      AdminLeavePage.clickAddLeave();
      LeaveForm.fillEmployee(EMPLOYEE_NORA_NEWBIE.name);
      LeaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(5), endDate: isoDate(10) });
      LeaveForm.submit();
      LeaveForm.get().should('not.exist');
      AdminLeavePage.checkRowCount(2);
    });
  });

  // ── Edit leave ────────────────────────────────────────────────────────────────

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

    it('edit form is pre-populated with the existing registration values', () => {
      AdminLeavePage.clickEdit(0);
      LeaveForm.getLeaveTypeSelect().should('have.value', LEAVE_TYPE_VACATION.name);
      LeaveForm.getStartDateInput().should('have.value', isoDate(-30));
      LeaveForm.getEndDateInput().should('have.value', isoDate(-28));
      LeaveForm.cancel();
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

    it('end date before start date → FORM_END_DATE_ERROR', () => {
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

  // ── Edit — overlap validation ─────────────────────────────────────────────────

  describe('edit — overlap validation', () => {
    it('editing a registration to overlap a different one for the same employee → OVERLAP error', () => {
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(9),
      });
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(15),
        endDate: isoDate(19),
      });
      AdminLeavePage.visit();
      // Edit the second record (later start date — table typically ordered desc) to overlap the first
      AdminLeavePage.clickEdit(0);
      LeaveForm.fillStartDate(isoDate(7));
      LeaveForm.fillEndDate(isoDate(17));
      LeaveForm.submit();
      LeaveForm.checkFormError(TEXTS.LEAVE_MANAGEMENT.FORM_OVERLAP_ERROR);
      LeaveForm.get().should('be.visible');
    });
  });

  // ── Delete leave ──────────────────────────────────────────────────────────────

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

  // ── Filters ───────────────────────────────────────────────────────────────────

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

    it('filter by employee with no matching records — shows empty state', () => {
      AdminLeavePage.filterByEmployee('ZZZ No Such Employee');
      AdminLeavePage.checkEmptyState();
    });

    it('filter by multiple leave types — shows only records of those types', () => {
      AdminLeavePage.filterByType([LEAVE_TYPE_VACATION.name, LEAVE_TYPE_PUBLIC_HOLIDAY.name]);
      AdminLeavePage.checkRowCount(2);
    });

    it('changing a filter triggers a new API fetch', () => {
      cy.intercept('GET', '/api/admin/leave*').as('adminFetch');
      AdminLeavePage.filterByEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      cy.wait('@adminFetch');
      AdminLeavePage.checkRowCount(1);
    });
  });

  // ── Date formatting ───────────────────────────────────────────────────────────

  describe('date formatting', () => {
    it('dates in the admin leave table display as DD-MM-YYYY', () => {
      const startDate = isoDate(5);
      const endDate = isoDate(7);
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate,
        endDate,
      });
      AdminLeavePage.visit();
      AdminLeavePage.getRow(0).should('contain.text', displayDate(startDate));
      AdminLeavePage.getRow(0).should('contain.text', displayDate(endDate));
    });

    it('duration in days is shown in the Duration column', () => {
      // isoDate(5) to isoDate(7) = 3 calendar days
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(7),
      });
      AdminLeavePage.visit();
      AdminLeavePage.getDurationCell(0).should('contain.text', '3');
    });
  });

  // ── Table order ───────────────────────────────────────────────────────────────

  describe('table order', () => {
    it('leave table is sorted by start date descending — most recent first', () => {
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(7),
      });
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(14),
        endDate: isoDate(16),
      });
      AdminLeavePage.visit();
      AdminLeavePage.getRow(0).should('contain.text', displayDate(isoDate(14)));
      AdminLeavePage.getRow(1).should('contain.text', displayDate(isoDate(5)));
    });
  });

  // ── Pagination ────────────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('prev button disabled on first page, next disabled when only one page exists', () => {
      AdminLeavePage.getPrevPage().should('be.disabled');
      AdminLeavePage.getNextPage().should('be.disabled');
    });

    it('21+ records — next page button becomes enabled', () => {
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
      AdminLeavePage.getNextPage().should('not.be.disabled');
    });

    it('applying a filter resets pagination to page 1', () => {
      for (let i = 0; i < 21; i++) {
        apiAdminCreateLeave(adminToken, {
          employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(i + 1),
          endDate: isoDate(i + 1),
        });
      }
      AdminLeavePage.visit();
      AdminLeavePage.getNextPage().click();
      AdminLeavePage.getPrevPage().should('not.be.disabled');
      AdminLeavePage.filterByEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      AdminLeavePage.getPrevPage().should('be.disabled');
    });

    it('pagination control shows current page number and updates on navigation', () => {
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
      AdminLeavePage.getPaginationLabel().should('contain.text', '1');
      AdminLeavePage.getNextPage().click();
      AdminLeavePage.getPaginationLabel().should('contain.text', '2');
    });
  });

  // ── Route guard ───────────────────────────────────────────────────────────────

  describe('route guard', () => {
    it('Employee navigating to /admin/leave is redirected', () => {
      cy.clearAllCookies();
      cy.clearAllLocalStorage();
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      cy.visit('/admin/leave');
      cy.url().should('not.include', '/admin/leave');
    });
  });
});
