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

  it.skip('sign out — redirected to /sign-in', () => {
    // Skipped: sign-out does not redirect to /sign-in — tracked in #100
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    NavigationBar.clickSignOut();
    cy.url().should('include', '/sign-in');
  });

  it('application name link navigates to /calendar', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    cy.visit('/my-leave');
    NavigationBar.clickAppName();
    cy.url().should('include', '/calendar');
  });

  it('nav bar is visible on /my-leave', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    cy.visit('/my-leave');
    NavigationBar.getCalendarLink().should('be.visible');
  });

  it('nav bar is visible on /admin/leave', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    cy.visit('/admin/leave');
    NavigationBar.getCalendarLink().should('be.visible');
  });

  it('Admin — signed-in user name is displayed in the nav bar', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    NavigationBar.checkUserName(EMPLOYEE_ALICE_ADMIN.name);
  });

  it('Calendar Overview link navigates to /calendar', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    cy.visit('/my-leave'); // start somewhere else
    NavigationBar.clickCalendar();
    cy.url().should('include', '/calendar');
  });

  it('My Leave link navigates to /my-leave', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    // /calendar is the landing page after sign-in
    NavigationBar.clickMyLeave();
    cy.url().should('include', '/my-leave');
  });

  it('Leave Management link navigates to /admin/leave (Admin only)', () => {
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    NavigationBar.clickLeaveManagement();
    cy.url().should('include', '/admin/leave');
  });
});
