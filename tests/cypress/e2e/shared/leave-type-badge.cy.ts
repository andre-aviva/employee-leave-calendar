import SignInPage from '../../support/pages/SignInPage';
import MyLeavePage from '../../support/pages/MyLeavePage';
import AdminLeavePage from '../../support/pages/AdminLeavePage';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
import {
  LEAVE_TYPE_VACATION,
  LEAVE_TYPE_SICK_LEAVE,
  LEAVE_TYPE_PUBLIC_HOLIDAY,
  LEAVE_TYPE_OTHER,
} from '../../support/testdata/leaveTypes';
import { apiSignIn, apiCreateMyLeave, apiCleanupMyLeave, apiAdminCreateLeave, apiCleanupAdminLeave } from '../../support/helpers/api';
import { isoDate } from '../../support/helpers/dates';

describe('Leave Type Badge', () => {
  // ── My Leave table ───────────────────────────────────────────────────────────

  describe('My Leave table row', () => {
    let eddieToken: string;

    beforeEach(() => {
      apiSignIn(EMPLOYEE_EDDIE_EMPLOYEE.username, EMPLOYEE_EDDIE_EMPLOYEE.password).then((t) => {
        eddieToken = t;
        apiCleanupMyLeave(t);
        apiCreateMyLeave(t, {
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(7),
          endDate: isoDate(9),
        });
      });
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      cy.intercept('GET', '**/api/me/leave').as('leaveFetch');
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
    });

    afterEach(() => {
      if (eddieToken) apiCleanupMyLeave(eddieToken);
    });

    it('badge is visible and shows the correct leave type name', () => {
      MyLeavePage.getLeaveTypeBadge(0).should('be.visible');
      MyLeavePage.getLeaveTypeBadge(0).should('contain.text', LEAVE_TYPE_VACATION.name);
    });

    it('Sick Leave badge is visible and shows the correct leave type name', () => {
      apiCleanupMyLeave(eddieToken);
      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
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
      cy.wait('@leaveFetch');
      MyLeavePage.getLeaveTypeBadge(0).should('be.visible');
      MyLeavePage.getLeaveTypeBadge(0).should('contain.text', LEAVE_TYPE_OTHER.name);
    });
  });

  // ── Leave Management table ───────────────────────────────────────────────────

  describe('Leave Management table row', () => {
    let adminToken: string;

    beforeEach(() => {
      apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then((t) => {
        adminToken = t;
        apiCleanupAdminLeave(t);
        apiAdminCreateLeave(t, {
          employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(5),
          endDate: isoDate(7),
        });
      });
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
      cy.intercept('GET', '**/api/admin/leave*').as('adminFetch');
      AdminLeavePage.visit();
      cy.wait('@adminFetch');
    });

    afterEach(() => {
      if (adminToken) apiCleanupAdminLeave(adminToken);
    });

    it('badge is visible and shows the correct leave type name', () => {
      AdminLeavePage.getLeaveTypeBadge(0).should('be.visible');
      AdminLeavePage.getLeaveTypeBadge(0).should('contain.text', LEAVE_TYPE_VACATION.name);
    });

    it('Public Holiday badge is visible and shows the correct leave type name', () => {
      apiCleanupAdminLeave(adminToken);
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_PUBLIC_HOLIDAY.id,
        startDate: isoDate(5),
        endDate: isoDate(7),
      });
      AdminLeavePage.visit();
      cy.wait('@adminFetch');
      AdminLeavePage.getLeaveTypeBadge(0).should('be.visible');
      AdminLeavePage.getLeaveTypeBadge(0).should('contain.text', LEAVE_TYPE_PUBLIC_HOLIDAY.name);
    });
  });
});
