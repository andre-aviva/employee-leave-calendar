import { element } from '../helpers/element';

class ConfirmationDialog {
  static get() {
    return cy.get(element('ConfirmationDialog'));
  }

  static getTitle() {
    return cy.get(element('ConfirmationDialog', element('ConfirmationDialog_Title')));
  }

  static getMessage() {
    return cy.get(element('ConfirmationDialog', element('ConfirmationDialog_Message')));
  }

  static getConfirmButton() {
    return cy.get(element('ConfirmationDialog', element('ConfirmationDialog_ConfirmButton')));
  }

  static getCancelButton() {
    return cy.get(element('ConfirmationDialog', element('ConfirmationDialog_CancelButton')));
  }

  static checkVisible() {
    this.get().should('be.visible');
  }

  static checkNotExist() {
    cy.get(element('ConfirmationDialog')).should('not.exist');
  }

  static clickConfirm() {
    this.getConfirmButton().click();
  }

  static clickCancel() {
    this.getCancelButton().click();
  }

  static clickBackdrop() {
    cy.get(element('ConfirmationDialog_Backdrop')).click({ force: true });
  }
}

export default ConfirmationDialog;
