import { test, expect } from '../../support/fixtures';
import {
  EMPLOYEE_ALICE_ADMIN,
  EMPLOYEE_EDDIE_EMPLOYEE,
  EMPLOYEE_NORA_NEWBIE,
} from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION, LEAVE_TYPE_PUBLIC_HOLIDAY, LEAVE_TYPE_OTHER } from '../../support/testdata/leaveTypes';
import { TEXTS } from '../../support/constants';
import { apiSignIn, apiAdminCreateLeave, apiCleanupAdminLeave } from '../../support/helpers/api';
import { isoDate, displayDate } from '../../support/helpers/dates';

test.describe('Leave Management (Admin only)', () => {
  let adminToken: string;

  test.beforeEach(async ({ request, page, signInPage, adminLeavePage }) => {
    adminToken = await apiSignIn(request, EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password);
    await apiCleanupAdminLeave(request, adminToken);
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    const resp = page.waitForResponse('**/api/admin/leave*');
    await adminLeavePage.visit();
    await resp;
  });

  test.afterEach(async ({ request }) => {
    if (adminToken) await apiCleanupAdminLeave(request, adminToken);
  });

  test.describe('table state', () => {
    test('shows empty state when no records match active filters', async ({ adminLeavePage }) => {
      await adminLeavePage.checkEmptyState();
    });

    test('shows error state when API returns 500', async ({ page, adminLeavePage }) => {
      await page.route('/api/admin/leave*', (route) => route.fulfill({ status: 500 }));
      const err = page.waitForResponse('/api/admin/leave*');
      await adminLeavePage.visit();
      await err;
      await adminLeavePage.checkErrorState();
    });

    test('retry button reloads data after error', async ({ page, adminLeavePage }) => {
      await page.route('/api/admin/leave*', (route) => route.fulfill({ status: 500 }));
      const err = page.waitForResponse('/api/admin/leave*');
      await adminLeavePage.visit();
      await err;
      await page.unroute('/api/admin/leave*');
      const ok = page.waitForResponse('/api/admin/leave*');
      await adminLeavePage.getRetryButton().click();
      await ok;
      await adminLeavePage.checkEmptyState();
    });
  });

  test.describe('create leave', () => {
    test('any employee, any leave type including Public Holiday → table refreshes', async ({ adminLeavePage, leaveForm }) => {
      await adminLeavePage.clickAddLeave();
      await expect(leaveForm.get()).toBeVisible();
      await leaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      await leaveForm.fill({ leaveType: LEAVE_TYPE_PUBLIC_HOLIDAY, startDate: isoDate(7), endDate: isoDate(9) });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await adminLeavePage.checkRowCount(1);
    });

    test('1-day leave (start == end) → succeeds', async ({ adminLeavePage, leaveForm }) => {
      const singleDay = isoDate(5);
      await adminLeavePage.clickAddLeave();
      await leaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: singleDay, endDate: singleDay });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await adminLeavePage.checkRowCount(1);
    });

    test('end date before start date → FORM_END_DATE_ERROR', async ({ adminLeavePage, leaveForm }) => {
      await adminLeavePage.clickAddLeave();
      await leaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(5) });
      await leaveForm.submit();
      await leaveForm.checkEndDateError(TEXTS.LEAVE_MANAGEMENT.FORM_END_DATE_ERROR);
      await expect(leaveForm.get()).toBeVisible();
    });

    test('overlap with existing → OVERLAP form-level error', async ({ request, page, adminLeavePage, leaveForm }) => {
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(10),
      });
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
      await adminLeavePage.clickAddLeave();
      await leaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(12) });
      await leaveForm.submit();
      await leaveForm.checkFormError(TEXTS.LEAVE_MANAGEMENT.FORM_OVERLAP_ERROR);
      await expect(leaveForm.get()).toBeVisible();
    });

    test('adjacency counts as overlap', async ({ request, page, adminLeavePage, leaveForm }) => {
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(10),
      });
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
      await adminLeavePage.clickAddLeave();
      await leaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(10), endDate: isoDate(15) });
      await leaveForm.submit();
      await leaveForm.checkFormError(TEXTS.LEAVE_MANAGEMENT.FORM_OVERLAP_ERROR);
      await expect(leaveForm.get()).toBeVisible();
    });

    test('cancel closes form without saving', async ({ adminLeavePage, leaveForm }) => {
      await adminLeavePage.clickAddLeave();
      await expect(leaveForm.get()).toBeVisible();
      await leaveForm.cancel();
      await expect(leaveForm.get()).not.toBeAttached();
      await adminLeavePage.checkEmptyState();
    });

    test('Admin can create leave with a past start date', async ({ adminLeavePage, leaveForm }) => {
      await adminLeavePage.clickAddLeave();
      await leaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(-14), endDate: isoDate(-12) });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await adminLeavePage.checkRowCount(1);
    });

    test('two different employees can have overlapping dates — no overlap error', async ({ request, page, adminLeavePage, leaveForm }) => {
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(10),
      });
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
      await adminLeavePage.clickAddLeave();
      await leaveForm.fillEmployee(EMPLOYEE_NORA_NEWBIE.name);
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(5), endDate: isoDate(10) });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await adminLeavePage.checkRowCount(2);
    });
  });

  test.describe('edit leave', () => {
    test.beforeEach(async ({ request, page, adminLeavePage }) => {
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(-30),
        endDate: isoDate(-28),
      });
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
    });

    test('edit form is pre-populated with the existing registration values', async ({ adminLeavePage, leaveForm }) => {
      await adminLeavePage.clickEdit(0);
      await expect(leaveForm.getLeaveTypeSelect()).toHaveValue(LEAVE_TYPE_VACATION.name);
      await expect(leaveForm.getStartDateInput()).toHaveValue(isoDate(-30));
      await expect(leaveForm.getEndDateInput()).toHaveValue(isoDate(-28));
      await leaveForm.cancel();
    });

    test('edit for any employee — no date restriction for admin → table refreshes', async ({ adminLeavePage, leaveForm }) => {
      await adminLeavePage.clickEdit(0);
      await leaveForm.fillStartDate(isoDate(-60));
      await leaveForm.fillEndDate(isoDate(-58));
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await adminLeavePage.checkRowCount(1);
    });

    test('Employee field is locked to the original employee when editing', async ({ adminLeavePage, leaveForm }) => {
      await adminLeavePage.clickEdit(0);
      await expect(leaveForm.getEmployeeSelect()).toBeDisabled();
      await leaveForm.cancel();
    });

    test('end date before start date → FORM_END_DATE_ERROR', async ({ adminLeavePage, leaveForm }) => {
      await adminLeavePage.clickEdit(0);
      await leaveForm.fillStartDate(isoDate(-30));
      await leaveForm.fillEndDate(isoDate(-35));
      await leaveForm.submit();
      await leaveForm.checkEndDateError(TEXTS.LEAVE_MANAGEMENT.FORM_END_DATE_ERROR);
      await expect(leaveForm.get()).toBeVisible();
    });

    test('cancel closes form without saving', async ({ adminLeavePage, leaveForm }) => {
      await adminLeavePage.clickEdit(0);
      await leaveForm.cancel();
      await expect(leaveForm.get()).not.toBeAttached();
      await adminLeavePage.checkRowCount(1);
    });
  });

  test.describe('delete leave', () => {
    test.beforeEach(async ({ request, page, adminLeavePage }) => {
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
    });

    test('clicking delete opens Confirmation Dialog', async ({ adminLeavePage, confirmationDialog }) => {
      await adminLeavePage.clickDelete(0);
      await confirmationDialog.checkVisible();
      await confirmationDialog.clickCancel();
    });

    test('cancel closes dialog without deleting', async ({ adminLeavePage, confirmationDialog }) => {
      await adminLeavePage.clickDelete(0);
      await confirmationDialog.clickCancel();
      await confirmationDialog.checkNotExist();
      await adminLeavePage.checkRowCount(1);
    });

    test('confirm → registration deleted, table refreshes', async ({ adminLeavePage, confirmationDialog }) => {
      await adminLeavePage.clickDelete(0);
      await confirmationDialog.clickConfirm();
      await confirmationDialog.checkNotExist();
      await adminLeavePage.checkEmptyState();
    });
  });

  test.describe('filters', () => {
    test.beforeEach(async ({ request, page, adminLeavePage }) => {
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(7),
      });
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_PUBLIC_HOLIDAY.id,
        startDate: isoDate(10),
        endDate: isoDate(12),
      });
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
    });

    test('filter by employee — shows only matching records', async ({ adminLeavePage }) => {
      await adminLeavePage.filterByEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      await adminLeavePage.checkRowCount(1);
      await expect(adminLeavePage.getRow(0)).toContainText(EMPLOYEE_EDDIE_EMPLOYEE.name);
    });

    test('filter by leave type — shows only matching records', async ({ adminLeavePage }) => {
      await adminLeavePage.filterByType([LEAVE_TYPE_PUBLIC_HOLIDAY.name]);
      await adminLeavePage.checkRowCount(1);
      await expect(adminLeavePage.getRow(0)).toContainText(LEAVE_TYPE_PUBLIC_HOLIDAY.name);
    });

    test('filter by date range — shows only records within the range', async ({ adminLeavePage }) => {
      await adminLeavePage.filterByDateRange(isoDate(4), isoDate(8));
      await adminLeavePage.checkRowCount(1);
      await expect(adminLeavePage.getRow(0)).toContainText(EMPLOYEE_EDDIE_EMPLOYEE.name);
    });

    test('filter by employee with no matching records — shows empty state', async ({ adminLeavePage }) => {
      await adminLeavePage.filterByEmployee('ZZZ No Such Employee');
      await adminLeavePage.checkEmptyState();
    });

    test('filter by multiple leave types — shows only records of those types', async ({ adminLeavePage }) => {
      await adminLeavePage.filterByType([LEAVE_TYPE_VACATION.name, LEAVE_TYPE_PUBLIC_HOLIDAY.name]);
      await adminLeavePage.checkRowCount(2);
    });

    test('date range filter with no matching records shows empty state', async ({ adminLeavePage }) => {
      await adminLeavePage.filterByDateRange(isoDate(20), isoDate(25));
      await adminLeavePage.checkEmptyState();
    });
  });

  test.describe('date formatting', () => {
    test('dates display as DD-MM-YYYY', async ({ request, page, adminLeavePage }) => {
      const startDate = isoDate(5);
      const endDate = isoDate(7);
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate,
        endDate,
      });
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
      await expect(adminLeavePage.getRow(0)).toContainText(displayDate(startDate));
      await expect(adminLeavePage.getRow(0)).toContainText(displayDate(endDate));
    });

    test('duration in days is shown in the Duration column', async ({ request, page, adminLeavePage }) => {
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(7),
      });
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
      await expect(adminLeavePage.getDurationCell(0)).toContainText('3');
    });
  });

  test.describe('table order', () => {
    test('leave table is sorted by start date descending — most recent first', async ({ request, page, adminLeavePage }) => {
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(7),
      });
      await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(14),
        endDate: isoDate(16),
      });
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
      await expect(adminLeavePage.getRow(0)).toContainText(displayDate(isoDate(14)));
      await expect(adminLeavePage.getRow(1)).toContainText(displayDate(isoDate(5)));
    });
  });

  test.describe('pagination', () => {
    test('prev button disabled on first page, next disabled when only one page exists', async ({ adminLeavePage }) => {
      await expect(adminLeavePage.getPrevPage()).toBeDisabled();
      await expect(adminLeavePage.getNextPage()).toBeDisabled();
    });

    test('21+ records — next page button becomes enabled', async ({ request, page, adminLeavePage }) => {
      const employees = [EMPLOYEE_EDDIE_EMPLOYEE, EMPLOYEE_NORA_NEWBIE, EMPLOYEE_ALICE_ADMIN];
      for (let i = 0; i < 21; i++) {
        const emp = employees[i % employees.length];
        await apiAdminCreateLeave(request, adminToken, {
          employeeId: emp.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(i + 1),
          endDate: isoDate(i + 1),
        });
      }
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
      await expect(adminLeavePage.getNextPage()).not.toBeDisabled();
    });

    test('pagination control shows current page number and updates on navigation', async ({ request, page, adminLeavePage }) => {
      const employees = [EMPLOYEE_EDDIE_EMPLOYEE, EMPLOYEE_NORA_NEWBIE, EMPLOYEE_ALICE_ADMIN];
      for (let i = 0; i < 21; i++) {
        const emp = employees[i % employees.length];
        await apiAdminCreateLeave(request, adminToken, {
          employeeId: emp.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(i + 1),
          endDate: isoDate(i + 1),
        });
      }
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
      await expect(adminLeavePage.getPaginationLabel()).toContainText('1');
      await adminLeavePage.getNextPage().click();
      await expect(adminLeavePage.getPaginationLabel()).toContainText('2');
    });
  });

  test.describe('route guard', () => {
    test('Employee navigating to /admin/leave is redirected', async ({ page, signInPage }) => {
      await page.context().clearCookies();
      await signInPage.visit();
      await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
      await page.goto('/admin/leave');
      await expect(page).not.toHaveURL(/\/admin\/leave/);
    });
  });

  test.describe('Other leave type', () => {
    test('Admin can create leave using the Other leave type', async ({ adminLeavePage, leaveForm }) => {
      await adminLeavePage.clickAddLeave();
      await leaveForm.fillEmployee(EMPLOYEE_EDDIE_EMPLOYEE.name);
      await leaveForm.fill({ leaveType: LEAVE_TYPE_OTHER, startDate: isoDate(7), endDate: isoDate(9) });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await adminLeavePage.checkRowCount(1);
    });
  });
});
