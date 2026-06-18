import { element } from '../helpers/element';

class AdminLeavePage {
  static visit() {
    cy.visit('/admin/leave');
  }

  static getAddLeaveButton() {
    return cy.get(element('AdminLeave_AddLeaveButton'));
  }

  static getTable() {
    return cy.get(element('AdminLeave_Table'));
  }

  static getTableRows() {
    return cy.get(element('AdminLeave_TableRow'));
  }

  static getRow(index: number) {
    return cy.get(element('AdminLeave_TableRow')).eq(index);
  }

  static getEditButton(index: number) {
    return cy.get(element('AdminLeave_TableRow')).eq(index).find(element('AdminLeave_EditButton'));
  }

  static getDeleteButton(index: number) {
    return cy.get(element('AdminLeave_TableRow'))
      .eq(index)
      .find(element('AdminLeave_DeleteButton'));
  }

  static getEmptyState() {
    return cy.get(element('AdminLeave_EmptyState'));
  }

  static getErrorState() {
    return cy.get(element('AdminLeave_ErrorState'));
  }

  static getEmployeeFilter() {
    return cy.get(element('AdminLeave_EmployeeFilter'));
  }

  static getTypeFilter() {
    return cy.get(element('AdminLeave_TypeFilter'));
  }

  static getStatusFilter() {
    return cy.get(element('AdminLeave_StatusFilter'));
  }

  static getFromFilter() {
    return cy.get(element('AdminLeave_FromFilter'));
  }

  static getToFilter() {
    return cy.get(element('AdminLeave_ToFilter'));
  }

  static getResetButton() {
    return cy.get(element('AdminLeave_ResetFilter'));
  }

  static getPrevPage() {
    return cy.get(element('AdminLeave_PrevPage'));
  }

  static getNextPage() {
    return cy.get(element('AdminLeave_NextPage'));
  }

  static clickAddLeave() {
    this.getAddLeaveButton().click();
  }

  static clickEdit(index: number) {
    this.getEditButton(index).click();
  }

  static clickDelete(index: number) {
    this.getDeleteButton(index).click();
  }

  static filterByEmployee(name: string) {
    this.getEmployeeFilter().clear().type(name);
  }

  static filterByType(name: string) {
    this.getTypeFilter().select(name);
  }

  static filterByDateRange(from: string, to: string) {
    this.getFromFilter().clear().type(from);
    this.getToFilter().clear().type(to);
  }

  static resetFilters() {
    this.getResetButton().click();
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
}

export default AdminLeavePage;
