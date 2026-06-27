import { test as base, expect } from '@playwright/test';
import { SignInPage } from './pages/SignInPage';
import { NavigationBar } from './pages/NavigationBar';
import { LeaveForm } from './pages/LeaveForm';
import { CalendarPage } from './pages/CalendarPage';
import { ConfirmationDialog } from './pages/ConfirmationDialog';
import { MyLeavePage } from './pages/MyLeavePage';
import { AdminLeavePage } from './pages/AdminLeavePage';

type PageObjects = {
  signInPage: SignInPage;
  navigationBar: NavigationBar;
  leaveForm: LeaveForm;
  calendarPage: CalendarPage;
  confirmationDialog: ConfirmationDialog;
  myLeavePage: MyLeavePage;
  adminLeavePage: AdminLeavePage;
};

export const test = base.extend<PageObjects>({
  signInPage: async ({ page }, use) => { await use(new SignInPage(page)); },
  navigationBar: async ({ page }, use) => { await use(new NavigationBar(page)); },
  leaveForm: async ({ page }, use) => { await use(new LeaveForm(page)); },
  calendarPage: async ({ page }, use) => { await use(new CalendarPage(page)); },
  confirmationDialog: async ({ page }, use) => { await use(new ConfirmationDialog(page)); },
  myLeavePage: async ({ page }, use) => { await use(new MyLeavePage(page)); },
  adminLeavePage: async ({ page }, use) => { await use(new AdminLeavePage(page)); },
});

export { expect };
