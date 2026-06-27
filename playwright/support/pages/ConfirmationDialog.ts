import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { element } from '../helpers/element';

export class ConfirmationDialog {
  constructor(private readonly page: Page) {}

  get() { return this.page.locator(element('ConfirmationDialog')); }
  getTitle() { return this.get().locator(element('ConfirmationDialog_Title')); }
  getMessage() { return this.get().locator(element('ConfirmationDialog_Message')); }
  getConfirmButton() { return this.get().locator(element('ConfirmationDialog_ConfirmButton')); }
  getCancelButton() { return this.get().locator(element('ConfirmationDialog_CancelButton')); }

  async checkVisible() { await expect(this.get()).toBeVisible(); }
  async checkNotExist() { await expect(this.get()).not.toBeAttached(); }
  async clickConfirm() { await this.getConfirmButton().click(); }
  async clickCancel() { await this.getCancelButton().click(); }
  async clickBackdrop() {
    await this.page.locator(element('ConfirmationDialog_Backdrop')).click({ force: true });
  }
}
