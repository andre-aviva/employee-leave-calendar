import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { element } from '../helpers/element';

export class CalendarPage {
  constructor(private readonly page: Page) {}

  async visit() { await this.page.goto('/calendar'); }

  getMonthLabel() { return this.page.locator(element('CalendarPage_MonthLabel')); }
  getPrevButton() { return this.page.locator(element('CalendarPage_PrevButton')); }
  getNextButton() { return this.page.locator(element('CalendarPage_NextButton')); }
  getGrid() { return this.page.locator(element('CalendarGrid')); }
  getDayCells() { return this.page.locator(element('CalendarGrid_DayCell')); }
  getTodayCell() { return this.page.locator('[data-test="CalendarGrid_DayCell"][data-today]'); }
  getLeaveChips() { return this.page.locator(element('EmployeeLeaveChip')); }
  getErrorState() { return this.page.locator(element('CalendarPage_ErrorState')); }
  getRetryButton() { return this.page.locator(element('CalendarPage_RetryButton')); }
  getLegend() { return this.page.locator(element('CalendarPage_Legend')); }
  getLegendItem(leaveTypeName: string) { return this.getLegend().getByText(leaveTypeName); }

  async clickPrevMonth() { await this.getPrevButton().click(); }
  async clickNextMonth() { await this.getNextButton().click(); }
  async checkErrorState() { await expect(this.getErrorState()).toBeVisible(); }
}
