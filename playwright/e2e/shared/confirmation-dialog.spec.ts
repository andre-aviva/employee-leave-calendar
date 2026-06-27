import { test, expect } from '../../support/fixtures';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION } from '../../support/testdata/leaveTypes';
import { TEXTS } from '../../support/constants';
import {
  apiSignIn,
  apiCreateMyLeave,
  apiCleanupMyLeave,
  apiAdminCreateLeave,
  apiCleanupAdminLeave,
} from '../../support/helpers/api';
import { isoDate } from '../../support/helpers/dates';

test.describe('Confirmation Dialog', () => {
  test.describe('My Leave — delete confirmation', () => {
    let eddieToken: string;

    test.beforeEach(async ({ request, page, signInPage, myLeavePage }) => {
      const [adminTok, eddieTok] = await Promise.all([
        apiSignIn(request, EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password),
        apiSignIn(request, EMPLOYEE_EDDIE_EMPLOYEE.username, EMPLOYEE_EDDIE_EMPLOYEE.password),
      ]);
      eddieToken = eddieTok;
      await Promise.all([
        apiCleanupAdminLeave(request, adminTok),
        apiCleanupMyLeave(request, eddieTok),
      ]);
      await apiCreateMyLeave(request, eddieTok, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(14),
        endDate: isoDate(16),
      });
      await signInPage.visit();
      await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
    });

    test.afterEach(async ({ request }) => {
      if (eddieToken) await apiCleanupMyLeave(request, eddieToken);
    });

    test('shows correct title, message, and button labels', async ({ myLeavePage, confirmationDialog }) => {
      await myLeavePage.clickDelete(0);
      await expect(confirmationDialog.getTitle()).toContainText(TEXTS.CONFIRMATION_DIALOG.TITLE);
      await expect(confirmationDialog.getMessage()).toContainText(TEXTS.CONFIRMATION_DIALOG.MESSAGE);
      await expect(confirmationDialog.getConfirmButton()).toContainText(TEXTS.CONFIRMATION_DIALOG.CONFIRM_LABEL);
      await expect(confirmationDialog.getCancelButton()).toContainText(TEXTS.CONFIRMATION_DIALOG.CANCEL_LABEL);
      await confirmationDialog.clickCancel();
    });

    test('clicking the backdrop does NOT close the dialog', async ({ myLeavePage, confirmationDialog }) => {
      await myLeavePage.clickDelete(0);
      await confirmationDialog.checkVisible();
      await confirmationDialog.clickBackdrop();
      await confirmationDialog.checkVisible();
      await confirmationDialog.clickCancel();
    });
  });

  test.describe('Leave Management — delete confirmation', () => {
    let adminToken: string;

    test.beforeEach(async ({ request, page, signInPage, adminLeavePage }) => {
      adminToken = await apiSignIn(request, EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password);
      await apiCleanupAdminLeave(request, adminToken);
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      await signInPage.visit();
      await signInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
    });

    test.afterEach(async ({ request }) => {
      if (adminToken) await apiCleanupAdminLeave(request, adminToken);
    });

    test('shows correct title, message, and button labels', async ({ adminLeavePage, confirmationDialog }) => {
      await adminLeavePage.clickDelete(0);
      await expect(confirmationDialog.getTitle()).toContainText(TEXTS.CONFIRMATION_DIALOG.TITLE);
      await expect(confirmationDialog.getMessage()).toContainText(TEXTS.CONFIRMATION_DIALOG.MESSAGE);
      await expect(confirmationDialog.getConfirmButton()).toContainText(TEXTS.CONFIRMATION_DIALOG.CONFIRM_LABEL);
      await expect(confirmationDialog.getCancelButton()).toContainText(TEXTS.CONFIRMATION_DIALOG.CANCEL_LABEL);
      await confirmationDialog.clickCancel();
    });

    test('clicking the backdrop does NOT close the dialog', async ({ adminLeavePage, confirmationDialog }) => {
      await adminLeavePage.clickDelete(0);
      await confirmationDialog.checkVisible();
      await confirmationDialog.clickBackdrop();
      await confirmationDialog.checkVisible();
      await confirmationDialog.clickCancel();
    });
  });
});
