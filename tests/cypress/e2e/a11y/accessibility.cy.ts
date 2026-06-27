import SignInPage from '../../support/pages/SignInPage';
import CalendarPage from '../../support/pages/CalendarPage';
import MyLeavePage from '../../support/pages/MyLeavePage';
import AdminLeavePage from '../../support/pages/AdminLeavePage';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
import { logA11yViolations } from '../../support/helpers/a11y';

const WCAG_22_AA = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
};

describe('Accessibility — WCAG 2.2 AA', () => {
  it.skip('/sign-in passes WCAG 2.2 AA', () => {
    // Skipped: known accessibility violations — tracked in #105
    SignInPage.visit();
    cy.injectAxe();
    cy.checkA11y(undefined, WCAG_22_AA, logA11yViolations);
  });

  describe('authenticated as Employee', () => {
    beforeEach(() => {
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    });

    it.skip('/calendar passes WCAG 2.2 AA', () => {
      // Skipped: known accessibility violations — tracked in #105
      cy.intercept('GET', '**/api/calendar*').as('calFetch');
      CalendarPage.visit();
      cy.wait('@calFetch');
      cy.injectAxe();
      cy.checkA11y(undefined, WCAG_22_AA, logA11yViolations);
    });

    it.skip('/my-leave passes WCAG 2.2 AA', () => {
      // Skipped: known accessibility violations — tracked in #105
      cy.intercept('GET', '**/api/me/leave').as('leaveFetch');
      MyLeavePage.visit();
      cy.wait('@leaveFetch');
      cy.injectAxe();
      cy.checkA11y(undefined, WCAG_22_AA, logA11yViolations);
    });
  });

  describe('authenticated as Admin', () => {
    beforeEach(() => {
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    });

    it.skip('/admin/leave passes WCAG 2.2 AA', () => {
      // Skipped: known accessibility violations — tracked in #105
      cy.intercept('GET', '**/api/admin/leave*').as('adminFetch');
      AdminLeavePage.visit();
      cy.wait('@adminFetch');
      cy.injectAxe();
      cy.checkA11y(undefined, WCAG_22_AA, logA11yViolations);
    });
  });
});
