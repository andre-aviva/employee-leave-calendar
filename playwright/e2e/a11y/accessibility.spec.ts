import { test } from '../../support/fixtures';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
import { checkA11y } from '../../support/helpers/a11y';

test.describe('Accessibility — WCAG 2.2 AA', () => {
  test('/sign-in passes WCAG 2.2 AA', async ({ page, signInPage }) => {
    await signInPage.visit();
    await checkA11y(page);
  });

  test.describe('authenticated as Employee', () => {
    test.beforeEach(async ({ signInPage }) => {
      await signInPage.visit();
      await signInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    });

    test('/calendar passes WCAG 2.2 AA', async ({ page, calendarPage }) => {
      const resp = page.waitForResponse('**/api/calendar*');
      await calendarPage.visit();
      await resp;
      await checkA11y(page);
    });

    test('/my-leave passes WCAG 2.2 AA', async ({ page, myLeavePage }) => {
      const resp = page.waitForResponse('**/api/me/leave');
      await myLeavePage.visit();
      await resp;
      await checkA11y(page);
    });
  });

  test.describe('authenticated as Admin', () => {
    test.beforeEach(async ({ signInPage }) => {
      await signInPage.visit();
      await signInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    });

    test('/admin/leave passes WCAG 2.2 AA', async ({ page, adminLeavePage }) => {
      const resp = page.waitForResponse('**/api/admin/leave*');
      await adminLeavePage.visit();
      await resp;
      await checkA11y(page);
    });
  });
});
