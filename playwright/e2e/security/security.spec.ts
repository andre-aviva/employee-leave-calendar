import { test, expect } from '../../support/fixtures';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE, EMPLOYEE_NORA_NEWBIE } from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION } from '../../support/testdata/leaveTypes';
import {
  apiSignIn,
  apiCreateMyLeave,
  apiDeleteMyLeave,
  apiCleanupAdminLeave,
} from '../../support/helpers/api';
import { isoDate } from '../../support/helpers/dates';

test.describe('Security (E2E smoke)', () => {
  let noraToken: string | undefined;
  let noraLeaveId: string | undefined;

  test.afterEach(async ({ request }) => {
    if (noraToken && noraLeaveId) {
      await apiDeleteMyLeave(request, noraToken, noraLeaveId);
      noraToken = undefined;
      noraLeaveId = undefined;
    }
  });

  test('unauthenticated user — all protected routes redirect to /sign-in', async ({ page }) => {
    for (const route of ['/calendar', '/my-leave', '/admin/leave']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/sign-in/);
    }
  });

  test('Employee-role user — navigating to /admin/leave is redirected by route guard', async ({ page, signInPage }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await page.goto('/admin/leave');
    await expect(page).not.toHaveURL(/\/admin\/leave/);
  });

  test("Employee cannot see another employee's leave registrations on My Leave page", async ({ request, page, signInPage, myLeavePage }) => {
    const adminTok = await apiSignIn(request, EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password);
    await apiCleanupAdminLeave(request, adminTok);
    noraToken = await apiSignIn(request, EMPLOYEE_NORA_NEWBIE.username, EMPLOYEE_NORA_NEWBIE.password);
    noraLeaveId = await apiCreateMyLeave(request, noraToken, {
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(7),
      endDate: isoDate(9),
    });

    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    const resp = page.waitForResponse('**/api/me/leave');
    await myLeavePage.visit();
    await resp;
    await myLeavePage.checkEmptyState();
  });

  test('after sign-out — all protected routes redirect to /sign-in', async ({ page, signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await navigationBar.clickSignOut();
    await expect(page).toHaveURL(/\/sign-in/);

    for (const route of ['/calendar', '/my-leave', '/admin/leave']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/sign-in/);
    }
  });

  test('Admin — after sign-out, /admin/leave redirects to /sign-in', async ({ page, signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    await navigationBar.clickSignOut();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto('/admin/leave');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test.describe('API access control — main leave endpoints', () => {
    let eddieApiToken: string;

    test.beforeAll(async ({ request }) => {
      eddieApiToken = await apiSignIn(request, EMPLOYEE_EDDIE_EMPLOYEE.username, EMPLOYEE_EDDIE_EMPLOYEE.password);
    });

    test('GET /api/me/leave — unauthenticated returns 401', async ({ request }) => {
      const res = await request.get('/api/me/leave');
      expect(res.status()).toBe(401);
    });

    test('POST /api/me/leave — unauthenticated returns 401', async ({ request }) => {
      const res = await request.post('/api/me/leave', {
        data: { leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(7), endDate: isoDate(9) },
      });
      expect(res.status()).toBe(401);
    });

    test('GET /api/admin/leave — unauthenticated returns 401', async ({ request }) => {
      const res = await request.get('/api/admin/leave');
      expect(res.status()).toBe(401);
    });

    test('GET /api/admin/leave — employee-role token returns 403', async ({ request }) => {
      const res = await request.get('/api/admin/leave', {
        headers: { Authorization: `Bearer ${eddieApiToken}` },
      });
      expect(res.status()).toBe(403);
    });

    test('POST /api/admin/leave — employee-role token returns 403', async ({ request }) => {
      const res = await request.post('/api/admin/leave', {
        headers: { Authorization: `Bearer ${eddieApiToken}` },
        data: {
          employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
          leaveTypeId: LEAVE_TYPE_VACATION.id,
          startDate: isoDate(7),
          endDate: isoDate(9),
        },
      });
      expect(res.status()).toBe(403);
    });
  });
});
