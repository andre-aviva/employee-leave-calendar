import SignInPage from '../../support/pages/SignInPage';
import NavigationBar from '../../support/pages/NavigationBar';
import MyLeavePage from '../../support/pages/MyLeavePage';
import { EMPLOYEE_EDDIE_EMPLOYEE, EMPLOYEE_NORA_NEWBIE } from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION } from '../../support/testdata/leaveTypes';
import { apiSignIn, apiCreateMyLeave, apiDeleteMyLeave } from '../../support/helpers/api';
import { isoDate } from '../../support/helpers/dates';

describe('Security (E2E smoke)', () => {
  let noraToken: string | undefined;
  let noraLeaveId: string | undefined;

  afterEach(() => {
    if (noraToken && noraLeaveId) {
      apiDeleteMyLeave(noraToken, noraLeaveId);
      noraToken = undefined;
      noraLeaveId = undefined;
    }
  });

  it('unauthenticated user — all protected routes redirect to /sign-in', () => {
    ['/calendar', '/my-leave', '/admin/leave'].forEach((route) => {
      cy.visit(route);
      cy.url().should('include', '/sign-in');
    });
  });

  it('Employee-role user — navigating to /admin/leave is redirected by route guard', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    cy.visit('/admin/leave');
    cy.url().should('not.include', '/admin/leave');
  });

  it("Employee cannot see another employee's leave registrations on My Leave page", () => {
    apiSignIn(EMPLOYEE_NORA_NEWBIE.username, EMPLOYEE_NORA_NEWBIE.password).then((t) => {
      noraToken = t;
      apiCreateMyLeave(noraToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      }).then((id) => { noraLeaveId = id; });
    });

    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    MyLeavePage.visit();
    MyLeavePage.checkEmptyState();
  });

  it('after sign-out — all protected routes redirect to /sign-in', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    NavigationBar.clickSignOut();
    cy.url().should('include', '/sign-in');

    ['/calendar', '/my-leave', '/admin/leave'].forEach((route) => {
      cy.visit(route);
      cy.url().should('include', '/sign-in');
    });
  });
});
