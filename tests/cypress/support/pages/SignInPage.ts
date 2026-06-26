import { element } from '../helpers/element';
import type { TestEmployee } from '../types';

class SignInPage {
  static visit() {
    cy.visit('/sign-in');
  }

  static getUsernameInput() {
    return cy.get(element('SignIn_UsernameInput'));
  }

  static getPasswordInput() {
    return cy.get(element('SignIn_PasswordInput'));
  }

  static getSubmitButton() {
    return cy.get(element('SignIn_SubmitButton'));
  }

  static getErrorMessage() {
    return cy.get(element('SignIn_ErrorMessage'));
  }

  static fillUsername(value: string) {
    this.getUsernameInput().clear().type(value);
  }

  static fillPassword(value: string) {
    this.getPasswordInput().clear().type(value);
  }

  static submit() {
    this.getSubmitButton().click();
  }

  static signIn(username: string, password: string) {
    cy.intercept('POST', '**/api/auth/sign-in').as('signInRequest');
    this.fillUsername(username);
    this.fillPassword(password);
    this.submit();
    cy.wait('@signInRequest');
  }

  static signInAs(employee: TestEmployee) {
    this.signIn(employee.username, employee.password);
  }

  static checkErrorVisible() {
    this.getErrorMessage().should('be.visible');
  }

  static checkRedirectedToCalendar() {
    cy.url().should('include', '/calendar');
  }
}

export default SignInPage;
