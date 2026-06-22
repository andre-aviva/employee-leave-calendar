import SignInPage from '../../support/pages/SignInPage';
import CalendarPage from '../../support/pages/CalendarPage';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE, EMPLOYEE_NORA_NEWBIE } from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION, ALL_LEAVE_TYPES } from '../../support/testdata/leaveTypes';
import { apiSignIn, apiAdminCreateLeave, apiAdminDeleteLeave } from '../../support/helpers/api';
import { isoDate } from '../../support/helpers/dates';

describe('Calendar Overview', () => {
  let adminToken: string;
  const createdIds: string[] = [];

  beforeEach(() => {
    apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then(
      (t) => { adminToken = t; },
    );
    SignInPage.visit();
    SignInPage.signInAs(EMPLOYEE_EDDIE_EMPLOYEE);
    CalendarPage.visit();
  });

  afterEach(() => {
    createdIds.forEach((id) => apiAdminDeleteLeave(adminToken, id));
    createdIds.length = 0;
  });

  it('month navigation — next month updates the month label', () => {
    CalendarPage.getMonthLabel().invoke('text').as('initialMonth');
    CalendarPage.clickNextMonth();
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
    const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString().split('T')[0];
    const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      .toISOString().split('T')[0];

    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_ALICE_ADMIN.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: lastDayThisMonth,
      endDate: firstDayNextMonth,
    }).then((id) => createdIds.push(id));

    CalendarPage.visit();
    CalendarPage.getLeaveChips().should('have.length.at.least', 1);
    CalendarPage.clickNextMonth();
    CalendarPage.getLeaveChips().should('have.length.at.least', 1);
  });

  it('empty month — all day cells render, no leave chips (12 months ahead)', () => {
    for (let i = 0; i < 12; i++) CalendarPage.clickNextMonth();
    CalendarPage.getDayCells().should('have.length.at.least', 28).and('have.length.at.most', 31);
    CalendarPage.getLeaveChips().should('not.exist');
  });

  it('error state — retry button reloads data', () => {
    cy.intercept('GET', '/api/calendar*', { statusCode: 500 }).as('calError');
    CalendarPage.visit();
    cy.wait('@calError');
    CalendarPage.checkErrorState();

    cy.intercept('GET', '/api/calendar*').as('calOk');
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
    CalendarPage.getGrid().should('be.visible');
  });

  it('two employees with leave on the same day — multiple chips visible', () => {
    const sameDay = new Date();
    sameDay.setDate(sameDay.getDate() + 7);
    const sameDayIso = sameDay.toISOString().split('T')[0];

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
    CalendarPage.getLeaveChips().should('have.length.at.least', 2);
  });

  it('month navigation triggers a new API fetch', () => {
    cy.intercept('GET', '/api/calendar*').as('calFetch');
    CalendarPage.clickNextMonth();
    cy.wait('@calFetch');
    CalendarPage.getGrid().should('be.visible');
  });

  it('leave chip shows the employee name', () => {
    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(5),
      endDate: isoDate(5),
    }).then((id) => createdIds.push(id));

    CalendarPage.visit();
    CalendarPage.getLeaveChips().first().should('contain.text', EMPLOYEE_EDDIE_EMPLOYEE.name);
  });

  it('leave chip shows the description when one is provided', () => {
    const description = 'Beach holiday';
    apiAdminCreateLeave(adminToken, {
      employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
      leaveTypeId: LEAVE_TYPE_VACATION.id,
      startDate: isoDate(6),
      endDate: isoDate(6),
      description,
    }).then((id) => createdIds.push(id));

    CalendarPage.visit();
    CalendarPage.getLeaveChips().first().should('contain.text', description);
  });

  // ── Leave type legend ─────────────────────────────────────────────────────────

  describe('leave type legend', () => {
    it('legend is visible below the calendar grid', () => {
      CalendarPage.getLegend().should('be.visible');
    });

    it('legend lists all four leave types', () => {
      ALL_LEAVE_TYPES.forEach((leaveType) => {
        CalendarPage.getLegendItem(leaveType.name).should('exist');
      });
    });
  });
});
