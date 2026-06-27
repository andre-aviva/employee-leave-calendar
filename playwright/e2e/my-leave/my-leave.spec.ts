import { test, expect } from '../../support/fixtures';
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

test.describe('My Leave', () => {
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
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    const resp = page.waitForResponse('**/api/me/leave');
    await myLeavePage.visit();
    await resp;
  });

  test.afterEach(async ({ request }) => {
    if (eddieToken) await apiCleanupMyLeave(request, eddieToken);
  });

  test.describe('table state', () => {
    test('shows empty state when no registrations exist', async ({ myLeavePage }) => {
      await myLeavePage.checkEmptyState();
    });

    test('shows error state when API returns 500', async ({ page, myLeavePage }) => {
      await page.route('/api/me/leave', (route) => route.fulfill({ status: 500 }));
      const errResp = page.waitForResponse('/api/me/leave');
      await myLeavePage.visit();
      await errResp;
      await myLeavePage.checkErrorState();
    });

    test('retry button reloads data after error', async ({ page, myLeavePage }) => {
      await page.route('/api/me/leave', (route) => route.fulfill({ status: 500 }));
      const errResp = page.waitForResponse('/api/me/leave');
      await myLeavePage.visit();
      await errResp;
      await page.unroute('/api/me/leave');
      const okResp = page.waitForResponse('/api/me/leave');
      await myLeavePage.getRetryButton().click();
      await okResp;
      await expect(myLeavePage.getEmptyState()).toBeVisible();
    });
  });

  test.describe('register leave', () => {
    test('happy path — future start date, valid type → form closes, table refreshes', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await expect(leaveForm.get()).toBeVisible();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(9) });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await myLeavePage.checkRowCount(1);
    });

    test('start date = today → succeeds', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(0), endDate: isoDate(0) });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await myLeavePage.checkRowCount(1);
    });

    test('past start date → FORM_START_DATE_ERROR below Start Date field', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(-1), endDate: isoDate(1) });
      await leaveForm.submit();
      await leaveForm.checkStartDateError(TEXTS.MY_LEAVE.FORM_START_DATE_ERROR);
      await expect(leaveForm.get()).toBeVisible();
    });

    test('end date before start date → FORM_END_DATE_ERROR below End Date field', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(5), endDate: isoDate(3) });
      await leaveForm.submit();
      await leaveForm.checkEndDateError(TEXTS.MY_LEAVE.FORM_END_DATE_ERROR);
      await expect(leaveForm.get()).toBeVisible();
    });

    test('1-day leave (start == end) → succeeds', async ({ myLeavePage, leaveForm }) => {
      const singleDay = isoDate(5);
      await myLeavePage.clickRegister();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: singleDay, endDate: singleDay });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await myLeavePage.checkRowCount(1);
    });

    test('overlap with existing registration → OVERLAP form-level error', async ({ request, page, myLeavePage, leaveForm }) => {
      await apiCreateMyLeave(request, eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(10),
      });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await myLeavePage.clickRegister();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(12) });
      await leaveForm.submit();
      await leaveForm.checkFormError(TEXTS.MY_LEAVE.FORM_OVERLAP_ERROR);
      await expect(leaveForm.get()).toBeVisible();
    });

    test('adjacency counts as overlap', async ({ request, page, myLeavePage, leaveForm }) => {
      await apiCreateMyLeave(request, eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(10),
      });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await myLeavePage.clickRegister();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(10), endDate: isoDate(15) });
      await leaveForm.submit();
      await leaveForm.checkFormError(TEXTS.MY_LEAVE.FORM_OVERLAP_ERROR);
      await expect(leaveForm.get()).toBeVisible();
    });

    test('restricted leave type (Public Holiday) → TYPE_NOT_REGISTERABLE error', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_PUBLIC_HOLIDAY, startDate: isoDate(5), endDate: isoDate(7) });
      await leaveForm.submit();
      await leaveForm.checkLeaveTypeError();
      await expect(leaveForm.get()).toBeVisible();
    });

    test('cancel closes form without saving', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await expect(leaveForm.get()).toBeVisible();
      await leaveForm.cancel();
      await expect(leaveForm.get()).not.toBeAttached();
      await myLeavePage.checkEmptyState();
    });
  });

  test.describe('edit and delete visibility', () => {
    test('buttons NOT visible on past-dated registrations', async ({ request, page, myLeavePage }) => {
      const adminTok = await apiSignIn(request, EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password);
      await apiAdminCreateLeave(request, adminTok, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(-7),
        endDate: isoDate(-5),
      });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await myLeavePage.checkEditButtonNotExist(0);
      await myLeavePage.checkDeleteButtonNotExist(0);
    });

    test('buttons NOT visible when start date is today', async ({ request, page, myLeavePage }) => {
      const adminTok = await apiSignIn(request, EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password);
      await apiAdminCreateLeave(request, adminTok, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(0),
        endDate: isoDate(2),
      });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await myLeavePage.checkEditButtonNotExist(0);
      await myLeavePage.checkDeleteButtonNotExist(0);
    });

    test('buttons visible on future-dated registrations', async ({ request, page, myLeavePage }) => {
      await apiCreateMyLeave(request, eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await expect(myLeavePage.getEditButton(0)).toBeVisible();
      await expect(myLeavePage.getDeleteButton(0)).toBeVisible();
    });
  });

  test.describe('edit leave', () => {
    test.beforeEach(async ({ request, page, myLeavePage }) => {
      await apiCreateMyLeave(request, eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(14),
        endDate: isoDate(16),
      });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
    });

    test('happy path — future registration → form closes, table refreshes', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickEdit(0);
      await expect(leaveForm.get()).toBeVisible();
      await leaveForm.fillStartDate(isoDate(21));
      await leaveForm.fillEndDate(isoDate(23));
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await myLeavePage.checkRowCount(1);
    });

    test('set new start date to today → succeeds', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickEdit(0);
      await leaveForm.fillStartDate(isoDate(0));
      await leaveForm.fillEndDate(isoDate(0));
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await myLeavePage.checkRowCount(1);
    });

    test('set new start date to past → FORM_START_DATE_ERROR', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickEdit(0);
      await leaveForm.fillStartDate(isoDate(-3));
      await leaveForm.fillEndDate(isoDate(16));
      await leaveForm.submit();
      await leaveForm.checkStartDateError(TEXTS.MY_LEAVE.FORM_START_DATE_ERROR);
      await expect(leaveForm.get()).toBeVisible();
    });

    test('end date before start date → FORM_END_DATE_ERROR', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickEdit(0);
      await leaveForm.fillStartDate(isoDate(14));
      await leaveForm.fillEndDate(isoDate(12));
      await leaveForm.submit();
      await leaveForm.checkEndDateError(TEXTS.MY_LEAVE.FORM_END_DATE_ERROR);
      await expect(leaveForm.get()).toBeVisible();
    });

    test('cancel closes form without saving', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickEdit(0);
      await expect(leaveForm.get()).toBeVisible();
      await leaveForm.fillStartDate(isoDate(21));
      await leaveForm.cancel();
      await expect(leaveForm.get()).not.toBeAttached();
      await myLeavePage.checkRowCount(1);
    });
  });

  test.describe('delete leave', () => {
    test.beforeEach(async ({ request, page, myLeavePage }) => {
      await apiCreateMyLeave(request, eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(14),
        endDate: isoDate(16),
      });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
    });

    test('clicking delete opens Confirmation Dialog', async ({ myLeavePage, confirmationDialog }) => {
      await myLeavePage.clickDelete(0);
      await confirmationDialog.checkVisible();
      await confirmationDialog.clickCancel();
    });

    test('cancel closes dialog without deleting', async ({ myLeavePage, confirmationDialog }) => {
      await myLeavePage.clickDelete(0);
      await confirmationDialog.clickCancel();
      await confirmationDialog.checkNotExist();
      await myLeavePage.checkRowCount(1);
    });

    test('confirm → registration deleted, table refreshes', async ({ myLeavePage, confirmationDialog }) => {
      await myLeavePage.clickDelete(0);
      await confirmationDialog.clickConfirm();
      await confirmationDialog.checkNotExist();
      await myLeavePage.checkEmptyState();
    });
  });

  test.describe('date formatting', () => {
    test('dates in the leave table display as DD-MM-YYYY', async ({ request, page, myLeavePage }) => {
      const startDate = isoDate(7);
      const endDate = isoDate(9);
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate, endDate });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await expect(myLeavePage.getRow(0)).toContainText(displayDate(startDate));
      await expect(myLeavePage.getRow(0)).toContainText(displayDate(endDate));
    });

    test('duration in days is shown in the Duration column', async ({ request, page, myLeavePage }) => {
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(7), endDate: isoDate(9) });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await expect(myLeavePage.getDurationCell(0)).toContainText('3');
    });
  });

  test.describe('table order', () => {
    test('leave table is sorted by start date descending — most recent first', async ({ request, page, myLeavePage }) => {
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(7), endDate: isoDate(9) });
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(14), endDate: isoDate(16) });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await expect(myLeavePage.getRow(0)).toContainText(displayDate(isoDate(14)));
      await expect(myLeavePage.getRow(1)).toContainText(displayDate(isoDate(7)));
    });
  });

  test.describe('form field visibility', () => {
    test('leave form for Employee has no Employee selector', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await expect(leaveForm.get()).toBeVisible();
      await expect(leaveForm.getEmployeeSelect()).not.toBeAttached();
      await leaveForm.cancel();
    });

    test('Public Holiday is not available in the Employee leave type dropdown', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await expect(leaveForm.getLeaveTypeSelect()).not.toContainText(LEAVE_TYPE_PUBLIC_HOLIDAY.name);
      await leaveForm.cancel();
    });
  });

  test.describe('edit pre-fill', () => {
    test('edit form is pre-populated with the existing registration values', async ({ request, page, myLeavePage, leaveForm }) => {
      const startDate = isoDate(14);
      const endDate = isoDate(16);
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate, endDate });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await myLeavePage.clickEdit(0);
      await expect(leaveForm.getLeaveTypeSelect()).toHaveValue(LEAVE_TYPE_VACATION.name);
      await expect(leaveForm.getStartDateInput()).toHaveValue(startDate);
      await expect(leaveForm.getEndDateInput()).toHaveValue(endDate);
      await leaveForm.cancel();
    });

    test('edit form has no Employee selector', async ({ request, page, myLeavePage, leaveForm }) => {
      const startDate = isoDate(14);
      const endDate = isoDate(16);
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate, endDate });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await myLeavePage.clickEdit(0);
      await expect(leaveForm.getEmployeeSelect()).not.toBeAttached();
      await leaveForm.cancel();
    });
  });

  test.describe('description field', () => {
    test('description is optional — form submits when description is filled', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(9), description: 'Beach holiday' });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await myLeavePage.checkRowCount(1);
    });

    test('description field enforces max 50 characters', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await leaveForm.fillDescription('a'.repeat(51));
      await expect(leaveForm.getDescriptionInput()).toHaveValue('a'.repeat(50));
      await leaveForm.cancel();
    });

    test('description is shown in the Description column', async ({ request, page, myLeavePage }) => {
      const description = 'Summer vacation';
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(7), endDate: isoDate(9), description });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await expect(myLeavePage.getDescriptionCell(0)).toContainText(description);
    });

    test('edit form is pre-populated with the existing description', async ({ request, page, myLeavePage, leaveForm }) => {
      const description = 'Beach holiday';
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(14), endDate: isoDate(16), description });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await myLeavePage.clickEdit(0);
      await expect(leaveForm.getDescriptionInput()).toHaveValue(description);
      await leaveForm.cancel();
    });
  });

  test.describe('notes field', () => {
    test('notes is optional — form submits when notes are filled', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_VACATION, startDate: isoDate(7), endDate: isoDate(9), notes: 'Doctor appointment' });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await myLeavePage.checkRowCount(1);
    });

    test('notes field enforces max 500 characters', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await leaveForm.fillNotes('a'.repeat(501));
      await expect(leaveForm.getNotesInput()).toHaveValue('a'.repeat(500));
      await leaveForm.cancel();
    });

    test('notes character counter reflects the number of characters typed', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await leaveForm.fillNotes('a'.repeat(400));
      await expect(leaveForm.getNotesCharCounter()).toContainText('400');
      await leaveForm.cancel();
    });

    test('hovering a row shows the notes tooltip when notes have been provided', async ({ request, page, myLeavePage }) => {
      const notes = 'Annual team retreat — flights booked';
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(7), endDate: isoDate(9), notes });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await myLeavePage.getRow(0).hover();
      await expect(page.locator('[role="tooltip"]')).toContainText(notes);
    });

    test('hovering a row with no notes does not show a tooltip', async ({ request, page, myLeavePage }) => {
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(7), endDate: isoDate(9) });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await myLeavePage.getRow(0).hover();
      await expect(page.locator('[role="tooltip"]')).not.toBeAttached();
    });

    test('edit form is pre-populated with the existing notes', async ({ request, page, myLeavePage, leaveForm }) => {
      const notes = 'Annual team retreat — flights booked';
      await apiCreateMyLeave(request, eddieToken, { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(14), endDate: isoDate(16), notes });
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await myLeavePage.clickEdit(0);
      await expect(leaveForm.getNotesInput()).toHaveValue(notes);
      await leaveForm.cancel();
    });
  });

  test.describe('Other leave type', () => {
    test('Other leave type is available in the Employee leave type dropdown', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await expect(leaveForm.getLeaveTypeSelect()).toContainText(LEAVE_TYPE_OTHER.name);
      await leaveForm.cancel();
    });

    test('Other leave type is registerable by Employee', async ({ myLeavePage, leaveForm }) => {
      await myLeavePage.clickRegister();
      await leaveForm.fill({ leaveType: LEAVE_TYPE_OTHER, startDate: isoDate(7), endDate: isoDate(9) });
      await leaveForm.submit();
      await expect(leaveForm.get()).not.toBeAttached();
      await myLeavePage.checkRowCount(1);
    });
  });
});
