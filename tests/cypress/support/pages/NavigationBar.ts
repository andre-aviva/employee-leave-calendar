import { element } from '../helpers/element';

class NavigationBar {
  static getCalendarLink() {
    return cy.get(element('NavBar_CalendarLink'));
  }

  static getMyLeaveLink() {
    return cy.get(element('NavBar_MyLeaveLink'));
  }

  static getLeaveManagementLink() {
    return cy.get(element('NavBar_LeaveManagementLink'));
  }

  static getUserName() {
    return cy.get(element('NavBar_UserName'));
  }

  static getSignOutButton() {
    return cy.get(element('NavBar_SignOutButton'));
  }

  static checkEmployeeLinks() {
    this.getCalendarLink().should('be.visible');
    this.getMyLeaveLink().should('be.visible');
    cy.get(element('NavBar_LeaveManagementLink')).should('not.exist');
  }

  static checkAdminLinks() {
    this.getCalendarLink().should('be.visible');
    this.getMyLeaveLink().should('be.visible');
    this.getLeaveManagementLink().should('be.visible');
  }

  static checkUserName(name: string) {
    this.getUserName().should('contain.text', name);
  }

  static clickCalendar() {
    this.getCalendarLink().click();
  }

  static clickMyLeave() {
    this.getMyLeaveLink().click();
  }

  static clickLeaveManagement() {
    this.getLeaveManagementLink().click();
  }

  static clickSignOut() {
    this.getSignOutButton().click();
  }

  static getAppName() {
    return cy.get(element('NavBar_AppName'));
  }

  static clickAppName() {
    this.getAppName().click();
  }
}

export default NavigationBar;
