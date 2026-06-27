import { test, expect } from '../../support/fixtures';
import { EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';

test.describe('Sign In', () => {
  test.beforeEach(async ({ signInPage }) => {
    await signInPage.visit();
  });

  test('happy path — valid credentials redirect to /calendar', async ({ signInPage }) => {
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await signInPage.checkRedirectedToCalendar();
  });

  test('wrong credentials — error message shown on page', async ({ page, signInPage }) => {
    await signInPage.signIn(EMPLOYEE_EDDIE_EMPLOYEE.username, 'wrong-password');
    await signInPage.checkErrorVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('already signed in — navigating to /sign-in redirects to /calendar', async ({ page, signInPage }) => {
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await signInPage.checkRedirectedToCalendar();
    await signInPage.visit();
    await expect(page).toHaveURL(/\/calendar/);
  });

  test('unauthenticated — navigating to a protected page redirects to /sign-in', async ({ page }) => {
    await page.goto('/my-leave');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('empty username — error shown', async ({ page, signInPage }) => {
    await signInPage.fillPassword(EMPLOYEE_EDDIE_EMPLOYEE.password);
    await signInPage.submit();
    await signInPage.checkErrorVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('empty password — error shown', async ({ page, signInPage }) => {
    await signInPage.fillUsername(EMPLOYEE_EDDIE_EMPLOYEE.username);
    await signInPage.submit();
    await signInPage.checkErrorVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('unauthenticated — navigating to / redirects to /sign-in', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('authenticated — navigating to / redirects to /calendar', async ({ page, signInPage }) => {
    await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    await page.goto('/');
    await expect(page).toHaveURL(/\/calendar/);
  });
});
