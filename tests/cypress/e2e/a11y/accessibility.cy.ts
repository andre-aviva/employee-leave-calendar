import SignInPage from '../../support/pages/SignInPage';
import CalendarPage from '../../support/pages/CalendarPage';
import MyLeavePage from '../../support/pages/MyLeavePage';
import AdminLeavePage from '../../support/pages/AdminLeavePage';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';

const WCAG_22_AA = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
};

describe('Accessibility — WCAG 2.2 AA', () => {
  it('/sign-in passes WCAG 2.2 AA', () => {
    SignInPage.visit();
    cy.injectAxe();
    cy.checkA11y(undefined, WCAG_22_AA);
  });

  describe('authenticated as Employee', () => {
    beforeEach(() => {
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    });

    it('/calendar passes WCAG 2.2 AA', () => {
      CalendarPage.visit();
      cy.injectAxe();
      cy.checkA11y(undefined, WCAG_22_AA);
    });

    it('/my-leave passes WCAG 2.2 AA', () => {
      MyLeavePage.visit();
      cy.injectAxe();
      cy.checkA11y(undefined, WCAG_22_AA);
    });
  });

  describe('authenticated as Admin', () => {
    beforeEach(() => {
      SignInPage.visit();
      SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    });

    it('/admin/leave passes WCAG 2.2 AA', () => {
      AdminLeavePage.visit();
      cy.injectAxe();
      cy.checkA11y(undefined, WCAG_22_AA);
    });
  });
});
