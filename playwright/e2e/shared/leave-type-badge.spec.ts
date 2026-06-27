import { test, expect } from '../../support/fixtures';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
import {
  LEAVE_TYPE_VACATION,
  LEAVE_TYPE_SICK_LEAVE,
  LEAVE_TYPE_PUBLIC_HOLIDAY,
  LEAVE_TYPE_OTHER,
} from '../../support/testdata/leaveTypes';
import {
  apiSignIn,
  apiCreateMyLeave,
  apiCleanupMyLeave,
  apiAdminCreateLeave,
  apiCleanupAdminLeave,
} from '../../support/helpers/api';
import { isoDate } from '../../support/helpers/dates';

test.describe('Leave Type Badge', () => {
  test.describe('My Leave table row', () => {
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
        startDate: isoDate(7),
        endDate: isoDate(9),
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

    test('badge is visible and shows the correct leave type name', async ({ myLeavePage }) => {
      await expect(myLeavePage.getLeaveTypeBadge(0, LEAVE_TYPE_VACATION.name)).toBeVisible();
      await expect(myLeavePage.getLeaveTypeBadge(0, LEAVE_TYPE_VACATION.name)).toContainText(LEAVE_TYPE_VACATION.name);
    });

    test('Sick Leave badge is visible and shows the correct leave type name', async ({ request, page, myLeavePage }) => {
      await apiCleanupMyLeave(request, eddieToken);
      await apiCreateMyLeave(request, eddieToken, {
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await expect(myLeavePage.getLeaveTypeBadge(0, LEAVE_TYPE_SICK_LEAVE.name)).toBeVisible();
      await expect(myLeavePage.getLeaveTypeBadge(0, LEAVE_TYPE_SICK_LEAVE.name)).toContainText(LEAVE_TYPE_SICK_LEAVE.name);
    });

    test('Other badge is visible and shows the correct leave type name', async ({ request, page, myLeavePage }) => {
      await apiCleanupMyLeave(request, eddieToken);
      await apiCreateMyLeave(request, eddieToken, {
        leaveTypeId: LEAVE_TYPE_OTHER.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await expect(myLeavePage.getLeaveTypeBadge(0, LEAVE_TYPE_OTHER.name)).toBeVisible();
      await expect(myLeavePage.getLeaveTypeBadge(0, LEAVE_TYPE_OTHER.name)).toContainText(LEAVE_TYPE_OTHER.name);
    });
  });

  test.describe('Leave Management table row', () => {
    let adminToken: string;

    test.beforeEach(async ({ request, page, signInPage, adminLeavePage }) => {
      adminToken = await apiSignIn(request, EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password);
      await apiCleanupAdminLeave(request, adminToken);
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(7),
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

    test('badge is visible and shows the correct leave type name', async ({ adminLeavePage }) => {
      await expect(adminLeavePage.getLeaveTypeBadge(0, LEAVE_TYPE_VACATION.name)).toBeVisible();
      await expect(adminLeavePage.getLeaveTypeBadge(0, LEAVE_TYPE_VACATION.name)).toContainText(LEAVE_TYPE_VACATION.name);
    });

    test('Public Holiday badge is visible and shows the correct leave type name', async ({ request, page, adminLeavePage }) => {
      await apiCleanupAdminLeave(request, adminToken);
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_PUBLIC_HOLIDAY.id,
        startDate: isoDate(5),
        endDate: isoDate(7),
      });
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
      await expect(adminLeavePage.getLeaveTypeBadge(0, LEAVE_TYPE_PUBLIC_HOLIDAY.name)).toBeVisible();
      await expect(adminLeavePage.getLeaveTypeBadge(0, LEAVE_TYPE_PUBLIC_HOLIDAY.name)).toContainText(LEAVE_TYPE_PUBLIC_HOLIDAY.name);
    });
  });
});
