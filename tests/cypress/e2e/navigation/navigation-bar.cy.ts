import SignInPage from '../../support/pages/SignInPage';
import NavigationBar from '../../support/pages/NavigationBar';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';

describe('Navigation Bar', () => {
  it('Employee — sees Calendar and My Leave, no Leave Management link', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    NavigationBar.checkEmployeeLinks();
  });

  it('Admin — sees Calendar, My Leave, and Leave Management', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    NavigationBar.checkAdminLinks();
  });

  it('signed-in user name is displayed in the nav bar', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    NavigationBar.checkUserName(EMPLOYEE_EDDIE_EMPLOYEE.name);
  });

  it('sign out — redirected to /sign-in', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    NavigationBar.clickSignOut();
    cy.url().should('include', '/sign-in');
  });
});
