import { element } from '../helpers/element';

class MyLeavePage {
  static visit() {
    cy.visit('/my-leave');
  }

  static getRegisterButton() {
    return cy.get(element('MyLeave_RegisterButton'));
  }

  static getTable() {
    return cy.get(element('MyLeave_Table'));
  }

  static getTableRows() {
    return cy.get(element('MyLeave_TableRow'));
  }

  static getRow(index: number) {
    return cy.get(element('MyLeave_TableRow')).eq(index);
  }

  static getEditButton(index: number) {
    return cy.get(element('MyLeave_TableRow')).eq(index).find(element('MyLeave_EditButton'));
  }

  static getDeleteButton(index: number) {
    return cy.get(element('MyLeave_TableRow')).eq(index).find(element('MyLeave_DeleteButton'));
  }

  static getEmptyState() {
    return cy.get(element('MyLeave_EmptyState'));
  }

  static getErrorState() {
    return cy.get(element('MyLeave_ErrorState'));
  }

  static getRetryButton() {
    return cy.get(element('MyLeave_RetryButton'));
  }

  static getSuccessToast() {
    return cy.get(element('SuccessToast'));
  }

  static clickRegister() {
    this.getRegisterButton().click();
  }

  static clickEdit(index: number) {
    this.getEditButton(index).click();
  }

  static clickDelete(index: number) {
    this.getDeleteButton(index).click();
  }

  static checkEmptyState() {
    this.getEmptyState().should('be.visible');
  }

  static checkErrorState() {
    this.getErrorState().should('be.visible');
  }

  static checkRowCount(n: number) {
    this.getTableRows().should('have.length', n);
  }

  static checkEditButtonNotExist(index: number) {
    cy.get(element('MyLeave_TableRow'))
      .eq(index)
      .find(element('MyLeave_EditButton'))
      .should('not.exist');
  }

  static checkDeleteButtonNotExist(index: number) {
    cy.get(element('MyLeave_TableRow'))
      .eq(index)
      .find(element('MyLeave_DeleteButton'))
      .should('not.exist');
  }

  static checkSuccessToastVisible() {
    this.getSuccessToast().should('be.visible');
  }
}

export default MyLeavePage;
