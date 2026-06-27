import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { element } from '../helpers/element';
import type { TestEmployee } from '../types';

export class SignInPage {
  constructor(private readonly page: Page) {}

  async visit() { await this.page.goto('/sign-in'); }

  getUsernameInput() { return this.page.locator(element('SignIn_UsernameInput')); }
  getPasswordInput() { return this.page.locator(element('SignIn_PasswordInput')); }
  getSubmitButton() { return this.page.locator(element('SignIn_SubmitButton')); }
  getErrorMessage() { return this.page.locator(element('SignIn_ErrorMessage')); }

  async fillUsername(value: string) { await this.getUsernameInput().fill(value); }
  async fillPassword(value: string) { await this.getPasswordInput().fill(value); }
  async submit() { await this.getSubmitButton().click(); }

  async signIn(username: string, password: string) {
    await this.fillUsername(username);
    await this.fillPassword(password);
    const responsePromise = this.page.waitForResponse('**/api/auth/sign-in');
    await this.submit();
    await responsePromise;
  }

  async signInAs(employee: TestEmployee) { await this.signIn(employee.username, employee.password); }
  async checkErrorVisible() { await expect(this.getErrorMessage()).toBeVisible(); }
  async checkRedirectedToCalendar() { await expect(this.page).toHaveURL(/\/calendar/); }
}
