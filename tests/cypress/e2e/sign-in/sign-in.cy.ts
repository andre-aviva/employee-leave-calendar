import SignInPage from '../../support/pages/SignInPage';
import { EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';

describe('Sign In', () => {
  beforeEach(() => {
    SignInPage.visit();
  });

  it('happy path — valid credentials redirect to /calendar', () => {
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    SignInPage.checkRedirectedToCalendar();
  });

  it('wrong credentials — error message shown on page', () => {
    SignInPage.signIn(EMPLOYEE_EDDIE_EMPLOYEE.username, 'wrong-password');
    SignInPage.checkErrorVisible();
    cy.url().should('include', '/sign-in');
  });

  it('already signed in — navigating to /sign-in redirects to /calendar', () => {
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    SignInPage.checkRedirectedToCalendar();
    SignInPage.visit();
    cy.url().should('include', '/calendar');
  });

  it('unauthenticated — navigating to a protected page redirects to /sign-in', () => {
    cy.visit('/my-leave');
    cy.url().should('include', '/sign-in');
  });

  it('empty username — error shown', () => {
    SignInPage.fillPassword(EMPLOYEE_EDDIE_EMPLOYEE.password);
    SignInPage.submit();
    SignInPage.checkErrorVisible();
    cy.url().should('include', '/sign-in');
  });

  it('empty password — error shown', () => {
    SignInPage.fillUsername(EMPLOYEE_EDDIE_EMPLOYEE.username);
    SignInPage.submit();
    SignInPage.checkErrorVisible();
    cy.url().should('include', '/sign-in');
  });

  it('unauthenticated — navigating to / redirects to /sign-in', () => {
    cy.visit('/');
    cy.url().should('include', '/sign-in');
  });

  it('authenticated — navigating to / redirects to /calendar', () => {
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    cy.visit('/');
    cy.url().should('include', '/calendar');
  });
});
