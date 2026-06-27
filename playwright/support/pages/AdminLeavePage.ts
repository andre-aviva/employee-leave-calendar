import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { element } from '../helpers/element';

export class AdminLeavePage {
  constructor(readonly page: Page) {}

  async visit() { await this.page.goto('/admin/leave'); }

  getAddLeaveButton() { return this.page.locator(element('AdminLeave_AddLeaveButton')); }
  getTable() { return this.page.locator(element('AdminLeave_Table')); }
  getTableRows() { return this.page.locator(element('AdminLeave_TableRow')); }
  getRow(index: number) { return this.getTableRows().nth(index); }
  getEditButton(index: number) { return this.getTableRows().nth(index).locator(element('AdminLeave_EditButton')); }
  getDeleteButton(index: number) { return this.getTableRows().nth(index).locator(element('AdminLeave_DeleteButton')); }
  getEmptyState() { return this.page.locator(element('AdminLeave_EmptyState')); }
  getErrorState() { return this.page.locator(element('AdminLeave_ErrorState')); }
  getRetryButton() { return this.page.locator(element('AdminLeave_RetryButton')); }
  getEmployeeFilter() { return this.page.locator(element('AdminLeave_EmployeeFilter')); }
  getTypeFilter() { return this.page.locator(element('AdminLeave_TypeFilter')); }
  getFromFilter() { return this.page.locator(element('AdminLeave_FromFilter')); }
  getToFilter() { return this.page.locator(element('AdminLeave_ToFilter')); }
  getPrevPage() { return this.page.locator(element('AdminLeave_PrevPage')); }
  getNextPage() { return this.page.locator(element('AdminLeave_NextPage')); }
  getPaginationLabel() { return this.page.locator(element('AdminLeave_PaginationLabel')); }
  getDurationCell(index: number) { return this.getTableRows().nth(index).locator(element('AdminLeave_DurationCell')); }
  getDescriptionCell(index: number) { return this.getTableRows().nth(index).locator(element('AdminLeave_DescriptionCell')); }

  getLeaveTypeBadge(index: number, leaveTypeName: string) {
    const n = leaveTypeName.toLowerCase();
    const variant = n.includes('vacation') ? 'vacation'
      : n.includes('sick') ? 'sick'
      : n.includes('holiday') ? 'holiday'
      : 'other';
    return this.getTableRows().nth(index).locator(element(`Badge_${variant}`));
  }

  async clickAddLeave() { await this.getAddLeaveButton().click(); }
  async clickEdit(index: number) { await this.getEditButton(index).click(); }
  async clickDelete(index: number) { await this.getDeleteButton(index).click(); }
  async filterByEmployee(name: string) { await this.getEmployeeFilter().fill(name); }
  async filterByType(names: string[]) { await this.getTypeFilter().selectOption(names); }
  async filterByDateRange(from: string, to: string) {
    await this.getFromFilter().fill(from);
    await this.getToFilter().fill(to);
  }
  async checkEmptyState() { await expect(this.getEmptyState()).toBeVisible(); }
  async checkErrorState() { await expect(this.getErrorState()).toBeVisible(); }
  async checkRowCount(n: number) { await expect(this.getTableRows()).toHaveCount(n); }
}
