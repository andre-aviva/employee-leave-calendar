import SignInPage from '../../support/pages/SignInPage';
import CalendarPage from '../../support/pages/CalendarPage';
import { EMPLOYEE_ALICE_ADMIN, EMPLOYEE_EDDIE_EMPLOYEE } from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION } from '../../support/testdata/leaveTypes';
import { apiSignIn, apiAdminCreateLeave, apiAdminDeleteLeave } from '../../support/helpers/api';

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
    CalendarPage.getDayCells().should('have.length.at.least', 28);
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
});
