import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { element } from '../helpers/element';
import type { TestLeaveRegistration } from '../types';

export class LeaveForm {
  constructor(private readonly page: Page) {}

  get() { return this.page.locator(element('LeaveForm')); }
  getEmployeeSelect() { return this.page.locator(element('LeaveForm_EmployeeSelect')); }
  getLeaveTypeSelect() { return this.page.locator(element('LeaveForm_LeaveTypeSelect')); }
  getStartDateInput() { return this.page.locator(element('LeaveForm_StartDateInput')); }
  getEndDateInput() { return this.page.locator(element('LeaveForm_EndDateInput')); }
  getDescriptionInput() { return this.page.locator(element('LeaveForm_DescriptionInput')); }
  getNotesInput() { return this.page.locator(element('LeaveForm_NotesInput')); }
  getNotesCharCounter() { return this.page.locator(element('LeaveForm_NotesCharCounter')); }
  getSubmitButton() { return this.page.locator(element('LeaveForm_SubmitButton')); }
  getCancelButton() { return this.page.locator(element('LeaveForm_CancelButton')); }
  getStartDateError() { return this.page.locator(element('LeaveForm_StartDateError')); }
  getEndDateError() { return this.page.locator(element('LeaveForm_EndDateError')); }
  getLeaveTypeError() { return this.page.locator(element('LeaveForm_LeaveTypeError')); }
  getFormError() { return this.page.locator(element('LeaveForm_FormError')); }

  async fillEmployee(name: string) { await this.getEmployeeSelect().fill(name); }
  async fillLeaveType(name: string) { await this.getLeaveTypeSelect().selectOption(name); }
  async fillStartDate(date: string) { await this.getStartDateInput().fill(date); }
  async fillEndDate(date: string) { await this.getEndDateInput().fill(date); }
  async fillDescription(text: string) { await this.getDescriptionInput().fill(text); }
  async fillNotes(text: string) { await this.getNotesInput().fill(text); }

  async fill(registration: TestLeaveRegistration) {
    await this.fillLeaveType(registration.leaveType.name);
    await this.fillStartDate(registration.startDate);
    await this.fillEndDate(registration.endDate);
    if (registration.description) await this.fillDescription(registration.description);
    if (registration.notes) await this.fillNotes(registration.notes);
  }

  async submit() { await this.getSubmitButton().click(); }
  async cancel() { await this.getCancelButton().click(); }

  async checkStartDateError(text: string) { await expect(this.getStartDateError()).toContainText(text); }
  async checkEndDateError(text: string) { await expect(this.getEndDateError()).toContainText(text); }
  async checkLeaveTypeError() { await expect(this.getLeaveTypeError()).toBeVisible(); }
  async checkFormError(text: string) { await expect(this.getFormError()).toContainText(text); }
}
