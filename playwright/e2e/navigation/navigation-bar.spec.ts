import { test, expect } from '../../support/fixtures';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';

test.describe('Navigation Bar', () => {
  test('Employee — sees Calendar and My Leave, no Leave Management link', async ({ signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await navigationBar.checkEmployeeLinks();
  });

  test('Admin — sees Calendar, My Leave, and Leave Management', async ({ signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    await navigationBar.checkAdminLinks();
  });

  test('signed-in user name is displayed in the nav bar', async ({ signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await navigationBar.checkUserName(EMPLOYEE_EDDIE_EMPLOYEE.name);
  });

  test('sign out — redirected to /sign-in', async ({ page, signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await navigationBar.clickSignOut();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('application name link navigates to /calendar', async ({ page, signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await page.goto('/my-leave');
    await navigationBar.clickAppName();
    await expect(page).toHaveURL(/\/calendar/);
  });

  test('nav bar is visible on /my-leave', async ({ page, signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await page.goto('/my-leave');
    await expect(navigationBar.getCalendarLink()).toBeVisible();
  });

  test('nav bar is visible on /admin/leave', async ({ page, signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    await page.goto('/admin/leave');
    await expect(navigationBar.getCalendarLink()).toBeVisible();
  });

  test('Admin — signed-in user name is displayed in the nav bar', async ({ signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    await navigationBar.checkUserName(EMPLOYEE_ALICE_ADMIN.name);
  });

  test('Calendar Overview link navigates to /calendar', async ({ page, signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await page.goto('/my-leave');
    await navigationBar.clickCalendar();
    await expect(page).toHaveURL(/\/calendar/);
  });

  test('My Leave link navigates to /my-leave', async ({ page, signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await navigationBar.clickMyLeave();
    await expect(page).toHaveURL(/\/my-leave/);
  });

  test('Leave Management link navigates to /admin/leave (Admin only)', async ({ page, signInPage, navigationBar }) => {
    await signInPage.visit();
    await signInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    await navigationBar.clickLeaveManagement();
    await expect(page).toHaveURL(/\/admin\/leave/);
  });
});
