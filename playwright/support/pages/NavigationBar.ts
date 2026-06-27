import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { element } from '../helpers/element';

export class NavigationBar {
  constructor(private readonly page: Page) {}

  getCalendarLink() { return this.page.locator(element('NavBar_CalendarLink')); }
  getMyLeaveLink() { return this.page.locator(element('NavBar_MyLeaveLink')); }
  getLeaveManagementLink() { return this.page.locator(element('NavBar_LeaveManagementLink')); }
  getUserName() { return this.page.locator(element('NavBar_UserName')); }
  getSignOutButton() { return this.page.locator(element('NavBar_SignOutButton')); }
  getAppName() { return this.page.locator(element('NavBar_AppName')); }

  async checkEmployeeLinks() {
    await expect(this.getCalendarLink()).toBeVisible();
    await expect(this.getMyLeaveLink()).toBeVisible();
    await expect(this.getLeaveManagementLink()).not.toBeAttached();
  }

  async checkAdminLinks() {
    await expect(this.getCalendarLink()).toBeVisible();
    await expect(this.getMyLeaveLink()).toBeVisible();
    await expect(this.getLeaveManagementLink()).toBeVisible();
  }

  async checkUserName(name: string) { await expect(this.getUserName()).toContainText(name); }
  async clickCalendar() { await this.getCalendarLink().click(); }
  async clickMyLeave() { await this.getMyLeaveLink().click(); }
  async clickLeaveManagement() { await this.getLeaveManagementLink().click(); }
  async clickSignOut() { await this.getSignOutButton().click(); }
  async clickAppName() { await this.getAppName().click(); }
}
