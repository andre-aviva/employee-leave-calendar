import { test, expect } from '../../support/fixtures';
import {
  EMPLOYEE_ALICE_ADMIN,
  EMPLOYEE_EDDIE_EMPLOYEE,
  EMPLOYEE_NORA_NEWBIE,
} from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION, ALL_LEAVE_TYPES } from '../../support/testdata/leaveTypes';
import {
  apiSignIn,
  apiAdminCreateLeave,
  apiAdminDeleteLeave,
  apiCleanupAdminLeave,
} from '../../support/helpers/api';
import { isoDate } from '../../support/helpers/dates';
import { element } from '../../support/helpers/element';

test.describe('Calendar Overview', () => {
  let adminToken: string;
  const createdIds: string[] = [];

  test.beforeEach(async ({ request, page, signInPage, calendarPage }) => {
    adminToken = await apiSignIn(request, EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password);
    await apiCleanupAdminLeave(request, adminToken);
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    const calResponse = page.waitForResponse('**/api/calendar*');
    await calendarPage.visit();
    await calResponse;
  });

  test.afterEach(async ({ request }) => {
    await Promise.all(createdIds.map((id) => apiAdminDeleteLeave(request, adminToken, id)));
    createdIds.length = 0;
  });

  test('month navigation — next month updates the month label', async ({ page, calendarPage }) => {
    const initialMonth = await calendarPage.getMonthLabel().textContent();
    const calNext = page.waitForResponse('**/api/calendar*');
    await calendarPage.clickNextMonth();
    await calNext;
    await expect(calendarPage.getMonthLabel()).not.toHaveText(initialMonth!);
    const calPrev = page.waitForResponse('**/api/calendar*');
    await calendarPage.clickPrevMonth();
    await calPrev;
    await expect(calendarPage.getMonthLabel()).toHaveText(initialMonth!);
  });

  test('multi-day leave spanning a month boundary shows a chip in both months', async ({ request, page, calendarPage }) => {
    const today = new Date();
    const daysToLastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const lastDayThisMonth = isoDate(daysToLastDay);
    const firstDayNextMonth = isoDate(daysToLastDay + 1);

    const id = await apiAdminCreateLeave(request, adminToken, {
      employeeId: EMPLOYEE_ALICE_ADMIN.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: lastDayThisMonth,
      endDate: firstDayNextMonth,
    });
    createdIds.push(id);

    const calLoad = page.waitForResponse('**/api/calendar*');
    await calendarPage.visit();
    await calLoad;
    expect(await calendarPage.getLeaveChips().count()).toBeGreaterThanOrEqual(1);

    const calNext = page.waitForResponse('**/api/calendar*');
    await calendarPage.clickNextMonth();
    await calNext;
    expect(await calendarPage.getLeaveChips().count()).toBeGreaterThanOrEqual(1);
  });

  test('empty month — all day cells render, no leave chips (12 months ahead)', async ({ page, calendarPage }) => {
    for (let i = 0; i < 12; i++) {
      const resp = page.waitForResponse('**/api/calendar*');
      await calendarPage.clickNextMonth();
      await resp;
    }
    await expect(calendarPage.getGrid()).toBeVisible();
    await expect(calendarPage.getLeaveChips()).not.toBeAttached();
  });

  test('error state — retry button reloads data', async ({ page, calendarPage }) => {
    await page.route('/api/calendar*', (route) => route.fulfill({ status: 500 }));
    const errResp = page.waitForResponse('/api/calendar*');
    await calendarPage.visit();
    await errResp;
    await calendarPage.checkErrorState();

    await page.unroute('/api/calendar*');
    const okResp = page.waitForResponse('/api/calendar*');
    await calendarPage.getRetryButton().click();
    await okResp;
    await expect(calendarPage.getGrid()).toBeVisible();
  });

  test('Admin — /calendar is accessible and grid is visible', async ({ page, signInPage, calendarPage }) => {
    await page.context().clearCookies();
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    const calResp = page.waitForResponse('**/api/calendar*');
    await calendarPage.visit();
    await calResp;
    await expect(calendarPage.getGrid()).toBeVisible();
  });

  test('two employees with leave on the same day — multiple chips visible', async ({ request, page, calendarPage }) => {
    const today = new Date();
    const daysLeftInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const sameDayIso = isoDate(Math.min(7, daysLeftInMonth));

    const id1 = await apiAdminCreateLeave(request, adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: sameDayIso,
      endDate: sameDayIso,
    });
    createdIds.push(id1);
    const id2 = await apiAdminCreateLeave(request, adminToken, {
      employeeId: EMPLOYEE_NORA_NEWBIE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: sameDayIso,
      endDate: sameDayIso,
    });
    createdIds.push(id2);

    const calResp = page.waitForResponse('**/api/calendar*');
    await calendarPage.visit();
    await calResp;
    expect(await calendarPage.getLeaveChips().count()).toBeGreaterThanOrEqual(2);
  });

  test('month navigation triggers a new API fetch', async ({ page, calendarPage }) => {
    const resp = page.waitForResponse('**/api/calendar*');
    await calendarPage.clickNextMonth();
    await resp;
    await expect(calendarPage.getGrid()).toBeVisible();
  });

  test('leave chip shows the employee name', async ({ request, page, calendarPage }) => {
    const today = new Date();
    const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const startDate = isoDate(Math.min(5, daysLeft));
    const id = await apiAdminCreateLeave(request, adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate,
      endDate: startDate,
    });
    createdIds.push(id);
    const calResp = page.waitForResponse('**/api/calendar*');
    await calendarPage.visit();
    await calResp;
    const firstName = EMPLOYEE_EDDIE_EMPLOYEE.name.split(' ')[0];
    await expect(calendarPage.getLeaveChips().first()).toContainText(firstName);
  });

  test('leave chip shows the description when one is provided', async ({ request, page, calendarPage }) => {
    const today = new Date();
    const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const startDate = isoDate(Math.min(5, daysLeft));
    const description = 'Beach holiday';
    const id = await apiAdminCreateLeave(request, adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate,
      endDate: startDate,
      description,
    });
    createdIds.push(id);
    const calResp = page.waitForResponse('**/api/calendar*');
    await calendarPage.visit();
    await calResp;
    await expect(calendarPage.getLeaveChips().first()).toContainText(description);
  });

  test('chip with no description — EmployeeLeaveChip_Description is not rendered', async ({ request, page, calendarPage }) => {
    const today = new Date();
    const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const startDate = isoDate(Math.min(8, daysLeft));
    const id = await apiAdminCreateLeave(request, adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate,
      endDate: startDate,
    });
    createdIds.push(id);
    const calResp = page.waitForResponse('**/api/calendar*');
    await calendarPage.visit();
    await calResp;
    const firstName = EMPLOYEE_EDDIE_EMPLOYEE.name.split(' ')[0];
    const chip = calendarPage.getLeaveChips().first();
    await expect(chip).toContainText(firstName);
    await expect(chip.locator(element('EmployeeLeaveChip_Description'))).not.toBeAttached();
  });

  test('hovering a chip shows the notes tooltip when notes have been provided', async ({ request, page, calendarPage }) => {
    const today = new Date();
    const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const startDate = isoDate(Math.min(9, daysLeft));
    const notes = 'Annual team retreat — pre-booked';
    const id = await apiAdminCreateLeave(request, adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate,
      endDate: startDate,
      notes,
    });
    createdIds.push(id);
    const calResp = page.waitForResponse('**/api/calendar*');
    await calendarPage.visit();
    await calResp;
    await calendarPage.getLeaveChips().first().hover();
    await expect(page.locator('[role="tooltip"]')).toContainText(notes);
  });

  test('hovering a chip with no notes does not show a tooltip', async ({ request, page, calendarPage }) => {
    const today = new Date();
    const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const startDate = isoDate(Math.min(10, daysLeft));
    const id = await apiAdminCreateLeave(request, adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate,
      endDate: startDate,
    });
    createdIds.push(id);
    const calResp = page.waitForResponse('**/api/calendar*');
    await calendarPage.visit();
    await calResp;
    await calendarPage.getLeaveChips().first().hover();
    await expect(page.locator('[role="tooltip"]')).not.toBeAttached();
  });

  test("today's date cell is visually highlighted", async ({ calendarPage }) => {
    await expect(calendarPage.getTodayCell()).toHaveCount(1);
  });

  test('day cell shows an overflow indicator when registrations exceed the visible chip limit', async ({ request, page, calendarPage }) => {
    const today = new Date();
    const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const sameDay = isoDate(Math.min(11, daysLeft));
    for (const emp of [EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE, EMPLOYEE_NORA_NEWBIE]) {
      const id = await apiAdminCreateLeave(request, adminToken, {
        employeeId: emp.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: sameDay,
        endDate: sameDay,
      });
      createdIds.push(id);
    }
    const calResp = page.waitForResponse('**/api/calendar*');
    await calendarPage.visit();
    await calResp;
    await expect(page.locator('[data-test$="Overflow"]')).toBeAttached();
  });

  test.describe('leave type legend', () => {
    test('legend is visible below the calendar grid', async ({ calendarPage }) => {
      await expect(calendarPage.getLegend()).toBeVisible();
    });

    test('legend lists all four leave types', async ({ calendarPage }) => {
      for (const leaveType of ALL_LEAVE_TYPES) {
        await expect(calendarPage.getLegendItem(leaveType.name)).toBeAttached();
      }
    });
  });
});
