import { element } from '../helpers/element';
import type { TestLeaveRegistration } from '../types';

class LeaveForm {
  static get() {
    return cy.get(element('LeaveForm'));
  }

  static getEmployeeSelect() {
    return cy.get(element('LeaveForm_EmployeeSelect'));
  }

  static getLeaveTypeSelect() {
    return cy.get(element('LeaveForm_LeaveTypeSelect'));
  }

  static getStartDateInput() {
    return cy.get(element('LeaveForm_StartDateInput'));
  }

  static getEndDateInput() {
    return cy.get(element('LeaveForm_EndDateInput'));
  }

  static getDescriptionInput() {
    return cy.get(element('LeaveForm_DescriptionInput'));
  }

  static getNotesInput() {
    return cy.get(element('LeaveForm_NotesInput'));
  }

  static getSubmitButton() {
    return cy.get(element('LeaveForm_SubmitButton'));
  }

  static getCancelButton() {
    return cy.get(element('LeaveForm_CancelButton'));
  }

  static getStartDateError() {
    return cy.get(element('LeaveForm_StartDateError'));
  }

  static getEndDateError() {
    return cy.get(element('LeaveForm_EndDateError'));
  }

  static getLeaveTypeError() {
    return cy.get(element('LeaveForm_LeaveTypeError'));
  }

  static getFormError() {
    return cy.get(element('LeaveForm_FormError'));
  }

  static fillEmployee(name: string) {
    this.getEmployeeSelect().clear().type(name);
  }

  static fillLeaveType(name: string) {
    this.getLeaveTypeSelect().select(name);
  }

  static fillStartDate(date: string) {
    this.getStartDateInput().clear().type(date);
  }

  static fillEndDate(date: string) {
    this.getEndDateInput().clear().type(date);
  }

  static fillDescription(text: string) {
    this.getDescriptionInput().clear().type(text);
  }

  static fillNotes(text: string) {
    this.getNotesInput().clear().type(text);
  }

  static fill(registration: TestLeaveRegistration) {
    this.fillLeaveType(registration.leaveType.name);
    this.fillStartDate(registration.startDate);
    this.fillEndDate(registration.endDate);
    if (registration.description) this.fillDescription(registration.description);
    if (registration.notes) this.fillNotes(registration.notes);
  }

  static submit() {
    this.getSubmitButton().click();
  }

  static cancel() {
    this.getCancelButton().click();
  }

  static checkStartDateError(text: string) {
    this.getStartDateError().should('contain.text', text);
  }

  static checkEndDateError(text: string) {
    this.getEndDateError().should('contain.text', text);
  }

  static checkLeaveTypeError(text: string) {
    this.getLeaveTypeError().should('contain.text', text);
  }

  static checkFormError(text: string) {
    this.getFormError().should('contain.text', text);
  }
}

export default LeaveForm;
