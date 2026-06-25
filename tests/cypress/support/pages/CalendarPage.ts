import { element } from '../helpers/element';

class CalendarPage {
  static visit() {
    cy.visit('/calendar');
  }

  static getMonthLabel() {
    return cy.get(element('CalendarPage_MonthLabel'));
  }

  static getPrevButton() {
    return cy.get(element('CalendarPage_PrevButton'));
  }

  static getNextButton() {
    return cy.get(element('CalendarPage_NextButton'));
  }

  static getGrid() {
    return cy.get(element('CalendarGrid'));
  }

  static getDayCells() {
    return cy.get(element('CalendarGrid_DayCell'));
  }

  static getTodayCell() {
    return cy.get(element('CalendarGrid_DayCell')).filter('[data-today]');
  }

  static getLeaveChips() {
    return cy.get(element('EmployeeLeaveChip'));
  }

  static getErrorState() {
    return cy.get(element('CalendarPage_ErrorState'));
  }

  static getRetryButton() {
    return cy.get(element('CalendarPage_RetryButton'));
  }

  static getLegend() {
    return cy.get(element('CalendarPage_Legend'));
  }

  static getLegendItem(leaveTypeName: string) {
    return this.getLegend().contains(leaveTypeName);
  }

  static clickPrevMonth() {
    this.getPrevButton().click();
  }

  static clickNextMonth() {
    this.getNextButton().click();
  }

  static checkErrorState() {
    this.getErrorState().should('be.visible');
  }
}

export default CalendarPage;
