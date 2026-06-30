import SignInPage from '../../support/pages/SignInPage';
import CalendarPage from '../../support/pages/CalendarPage';
import {
  EMPLOYEE_ALICE_ADMIN,
  EMPLOYEE_EDDIE_EMPLOYEE,
  EMPLOYEE_NORA_NEWBIE,
} from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION, ALL_LEAVE_TYPES } from '../../support/testdata/leaveTypes';
import {
  apiSignIn,
  apiAdminCreateLeave,
  apiAdminDeleteLeave,
  apiCleanupAdminLeave,
} from '../../support/helpers/api';
import { isoDate } from '../../support/helpers/dates';
import { element } from '../../support/helpers/element';

describe('Calendar Overview', () => {
  let adminToken: string;
  const createdIds: string[] = [];

  beforeEach(() => {
    cy.intercept('GET', '**/api/calendar*').as('calFetch');

    apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then((t) => {
      adminToken = t;
      apiCleanupAdminLeave(t);
    });

    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    CalendarPage.visit();
    cy.wait('@calFetch');
  });

  afterEach(() => {
    createdIds.forEach((id) => apiAdminDeleteLeave(adminToken, id));
    createdIds.length = 0;
  });

  it('month navigation — next month updates the month label', () => {
    CalendarPage.getMonthLabel()
      .invoke('text')
      .then((text) => {
        cy.wrap(text).as('initialMonth');
      });
    CalendarPage.clickNextMonth();
    cy.wait('@calFetch');
    cy.get('@initialMonth').then((initial) => {
      CalendarPage.getMonthLabel().should('not.have.text', initial as string);
    });
    CalendarPage.clickPrevMonth();
    cy.get('@initialMonth').then((initial) => {
      CalendarPage.getMonthLabel().should('have.text', initial as string);
    });
  });

  it('multi-day leave spanning a month boundary shows a chip in both months', () => {
    const today = new Date();
    const daysToLastDay =
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const lastDayThisMonth = isoDate(daysToLastDay);
    const firstDayNextMonth = isoDate(daysToLastDay + 1);

    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_ALICE_ADMIN.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: lastDayThisMonth,
      endDate: firstDayNextMonth,
    }).then((id) => createdIds.push(id));

    CalendarPage.visit();
    cy.wait('@calFetch');
    CalendarPage.getLeaveChips().should('have.length.at.least', 1);
    CalendarPage.clickNextMonth();
    cy.wait('@calFetch');
    CalendarPage.getLeaveChips().should('have.length.at.least', 1);
  });

  it('empty month — all day cells render, no leave chips (12 months ahead)', () => {
    for (let i = 0; i < 12; i++) CalendarPage.clickNextMonth();
    CalendarPage.getGrid().should('be.visible');
    CalendarPage.getLeaveChips().should('not.exist');
  });

  it('error state — retry button reloads data', () => {
    cy.intercept('GET', '/api/calendar*', { statusCode: 500 }).as('calError');
    CalendarPage.visit();
    cy.wait('@calError');
    CalendarPage.checkErrorState();

    cy.intercept('GET', '/api/calendar*', { statusCode: 200, body: [] }).as('calOk');
    CalendarPage.getRetryButton().click();
    cy.wait('@calOk');
    CalendarPage.getGrid().should('be.visible');
  });

  it('Admin — /calendar is accessible and grid is visible', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_ALICE_ADMIN);
    CalendarPage.visit();
    cy.wait('@calFetch');
    CalendarPage.getGrid().should('be.visible');
  });

  it('two employees with leave on the same day — multiple chips visible', () => {
    const today = new Date();
    const daysLeftInMonth =
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const sameDayIso = isoDate(Math.min(7, daysLeftInMonth));

    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: sameDayIso,
      endDate: sameDayIso,
    }).then((id) => createdIds.push(id));

    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_NORA_NEWBIE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: sameDayIso,
      endDate: sameDayIso,
    }).then((id) => createdIds.push(id));

    CalendarPage.visit();
    cy.wait('@calFetch');
    CalendarPage.getLeaveChips().should('have.length.at.least', 2);
  });

  it('month navigation triggers a new API fetch', () => {
    CalendarPage.clickNextMonth();
    cy.wait('@calFetch');
    CalendarPage.getGrid().should('be.visible');
  });

  it('leave chip shows the employee name', () => {
    const today = new Date();
    const daysLeftInMonth =
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const startDate = isoDate(Math.min(5, daysLeftInMonth));

    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate,
      endDate: startDate,
    }).then((id) => createdIds.push(id));

    CalendarPage.visit();
    cy.wait('@calFetch');
    // FR: chip shows employee's first name or initials — assert on first name, not full display name
    CalendarPage.getLeaveChips()
      .first()
      .should('contain.text', EMPLOYEE_EDDIE_EMPLOYEE.name.split(' ')[0]);
  });

  it.skip('leave chip shows the description when one is provided', () => {
    // Skipped: leave chips do not show description or notes yet — tracked in #114
    const today = new Date();
    const daysLeftInMonth =
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const startDate = isoDate(Math.min(5, daysLeftInMonth));
    const description = 'Beach holiday';

    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate,
      endDate: startDate,
      description,
    }).then((id) => createdIds.push(id));

    CalendarPage.visit();
    cy.wait('@calFetch');
    CalendarPage.getLeaveChips().first().should('contain.text', description);
  });

  it('chip with no description shows only the employee name — no description text is rendered', () => {
    const today = new Date();
    const daysLeftInMonth =
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const startDate = isoDate(Math.min(8, daysLeftInMonth));

    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate,
      endDate: startDate,
      // description intentionally omitted
    }).then((id) => createdIds.push(id));

    CalendarPage.visit();
    cy.wait('@calFetch');
    const firstName = EMPLOYEE_EDDIE_EMPLOYEE.name.split(' ')[0];
    CalendarPage.getLeaveChips()
      .first()
      .within(() => {
        cy.contains(firstName).should('be.visible');
      });
    CalendarPage.getLeaveChips()
      .first()
      .find(element('EmployeeLeaveChip_Description'))
      .should('not.exist');
  });

  it.skip('hovering a chip shows the notes tooltip when notes have been provided', () => {
    // Skipped: leave chips do not show description or notes yet — tracked in #114
    const today = new Date();
    const daysLeftInMonth =
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const startDate = isoDate(Math.min(9, daysLeftInMonth));
    const notes = 'Annual team retreat — pre-booked';

    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate,
      endDate: startDate,
      notes,
    }).then((id) => createdIds.push(id));

    CalendarPage.visit();
    cy.wait('@calFetch');
    CalendarPage.getLeaveChips().first().realHover();
    cy.get('[role="tooltip"]').should('contain.text', notes);
  });

  it('hovering a chip with no notes does not show a tooltip', () => {
    const today = new Date();
    const daysLeftInMonth =
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const startDate = isoDate(Math.min(10, daysLeftInMonth));

    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate,
      endDate: startDate,
      // notes intentionally omitted
    }).then((id) => createdIds.push(id));

    CalendarPage.visit();
    cy.wait('@calFetch');
    CalendarPage.getLeaveChips().first().realHover();
    cy.get('[role="tooltip"]').should('not.exist');
  });

  it("today's date cell is visually highlighted", () => {
    CalendarPage.getTodayCell().should('have.length', 1);
  });

  it.skip('day cell shows an overflow indicator when registrations exceed the visible chip limit', () => {
    // Skipped: calendar day cells have no overflow indicator yet — tracked in #125
    const today = new Date();
    const daysLeftInMonth =
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    const sameDay = isoDate(Math.min(11, daysLeftInMonth));
    // Seed all three test employees on the same day to maximise chip count
    [EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE, EMPLOYEE_NORA_NEWBIE].forEach((emp) => {
      apiAdminCreateLeave(adminToken, {
        employeeId: emp.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: sameDay,
        endDate: sameDay,
      }).then((id) => createdIds.push(id));
    });
    CalendarPage.visit();
    cy.wait('@calFetch');
    // If the visible-chip threshold is ≤ 3, an overflow indicator will exist.
    // If this assertion fails, the threshold is > 3 — triage with the team to agree
    // on a test approach (e.g. add more test employees or adjust the threshold).
    cy.get('[data-test$="Overflow"]').should('exist');
  });

  // ── Leave type legend ─────────────────────────────────────────────────────────

  describe('leave type legend', () => {
    it.skip('legend is visible below the calendar grid', () => {
      // Skipped: legend is currently rendered above the grid, not below — tracked in #126
      CalendarPage.getLegend().should('be.visible');
    });

    it('legend lists all four leave types', () => {
      ALL_LEAVE_TYPES.forEach((leaveType) => {
        CalendarPage.getLegendItem(leaveType.name).should('exist');
      });
    });
  });
});
