import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { element } from '../helpers/element';

export class MyLeavePage {
  constructor(readonly page: Page) {}

  async visit() { await this.page.goto('/my-leave'); }

  getRegisterButton() { return this.page.locator(element('MyLeave_RegisterButton')); }
  getTable() { return this.page.locator(element('MyLeave_Table')); }
  getTableRows() { return this.page.locator(element('MyLeave_TableRow')); }
  getRow(index: number) { return this.getTableRows().nth(index); }
  getEditButton(index: number) { return this.getTableRows().nth(index).locator(element('MyLeave_EditButton')); }
  getDeleteButton(index: number) { return this.getTableRows().nth(index).locator(element('MyLeave_DeleteButton')); }
  getEmptyState() { return this.page.locator(element('MyLeave_EmptyState')); }
  getErrorState() { return this.page.locator(element('MyLeave_ErrorState')); }
  getRetryButton() { return this.page.locator(element('MyLeave_RetryButton')); }
  getDurationCell(index: number) { return this.getTableRows().nth(index).locator(element('MyLeave_DurationCell')); }
  getDescriptionCell(index: number) { return this.getTableRows().nth(index).locator(element('MyLeave_DescriptionCell')); }

  getLeaveTypeBadge(index: number, leaveTypeName: string) {
    const n = leaveTypeName.toLowerCase();
    const variant = n.includes('vacation') ? 'vacation'
      : n.includes('sick') ? 'sick'
      : n.includes('holiday') ? 'holiday'
      : 'other';
    return this.getTableRows().nth(index).locator(element(`Badge_${variant}`));
  }

  async clickRegister() { await this.getRegisterButton().click(); }
  async clickEdit(index: number) { await this.getEditButton(index).click(); }
  async clickDelete(index: number) { await this.getDeleteButton(index).click(); }
  async checkEmptyState() { await expect(this.getEmptyState()).toBeVisible(); }
  async checkErrorState() { await expect(this.getErrorState()).toBeVisible(); }
  async checkRowCount(n: number) { await expect(this.getTableRows()).toHaveCount(n); }
  async checkEditButtonNotExist(index: number) { await expect(this.getEditButton(index)).not.toBeAttached(); }
  async checkDeleteButtonNotExist(index: number) { await expect(this.getDeleteButton(index)).not.toBeAttached(); }
}
