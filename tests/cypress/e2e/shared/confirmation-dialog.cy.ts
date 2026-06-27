import SignInPage from '../../support/pages/SignInPage';
import MyLeavePage from '../../support/pages/MyLeavePage';
import AdminLeavePage from '../../support/pages/AdminLeavePage';
import ConfirmationDialog from '../../support/pages/ConfirmationDialog';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION } from '../../support/testdata/leaveTypes';
import { TEXTS } from '../../support/constants';
import { apiSignIn, apiCreateMyLeave, apiCleanupMyLeave, apiAdminCreateLeave, apiCleanupAdminLeave } from '../../support/helpers/api';
import { isoDate } from '../../support/helpers/dates';

describe('Confirmation Dialog', () => {
  // ── My Leave context ─────────────────────────────────────────────────────────

  describe('My Leave — delete confirmation', () => {
    let eddieToken: string;

    beforeEach(() => {
      apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then((t) => {
        apiCleanupAdminLeave(t);
      });
      apiSignIn(EMPLOYEE_EDDIE_EMPLOYEE.username, EMPLOYEE_EDDIE_EMPLOYEE.password).then((t) => {
        eddieToken = t;
        apiCleanupMyLeave(t);
        apiCreateMyLeave(t, {
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(14),
          endDate: isoDate(16),
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

    it('shows correct title, message, and button labels', () => {
      MyLeavePage.clickDelete(0);
      ConfirmationDialog.getTitle().should('contain.text', TEXTS.CONFIRMATION_DIALOG.TITLE);
      ConfirmationDialog.getMessage().should('contain.text', TEXTS.CONFIRMATION_DIALOG.MESSAGE);
      ConfirmationDialog.getConfirmButton().should('contain.text', TEXTS.CONFIRMATION_DIALOG.CONFIRM_LABEL);
      ConfirmationDialog.getCancelButton().should('contain.text', TEXTS.CONFIRMATION_DIALOG.CANCEL_LABEL);
      ConfirmationDialog.clickCancel();
    });

    it.skip('clicking the backdrop does NOT close the dialog', () => {
      // Skipped: dialog currently closes on backdrop click — tracked in #121
      MyLeavePage.clickDelete(0);
      ConfirmationDialog.checkVisible();
      ConfirmationDialog.clickBackdrop();
      ConfirmationDialog.checkVisible();
      ConfirmationDialog.clickCancel();
    });
  });

  // ── Leave Management context ─────────────────────────────────────────────────

  describe('Leave Management — delete confirmation', () => {
    let adminToken: string;

    beforeEach(() => {
      apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then((t) => {
        adminToken = t;
        apiCleanupAdminLeave(t);
        apiAdminCreateLeave(t, {
          employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(7),
          endDate: isoDate(9),
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

    it('shows correct title, message, and button labels', () => {
      AdminLeavePage.clickDelete(0);
      ConfirmationDialog.getTitle().should('contain.text', TEXTS.CONFIRMATION_DIALOG.TITLE);
      ConfirmationDialog.getMessage().should('contain.text', TEXTS.CONFIRMATION_DIALOG.MESSAGE);
      ConfirmationDialog.getConfirmButton().should('contain.text', TEXTS.CONFIRMATION_DIALOG.CONFIRM_LABEL);
      ConfirmationDialog.getCancelButton().should('contain.text', TEXTS.CONFIRMATION_DIALOG.CANCEL_LABEL);
      ConfirmationDialog.clickCancel();
    });

    it.skip('clicking the backdrop does NOT close the dialog', () => {
      // Skipped: dialog currently closes on backdrop click — tracked in #121
      AdminLeavePage.clickDelete(0);
      ConfirmationDialog.checkVisible();
      ConfirmationDialog.clickBackdrop();
      ConfirmationDialog.checkVisible();
      ConfirmationDialog.clickCancel();
    });
  });
});
