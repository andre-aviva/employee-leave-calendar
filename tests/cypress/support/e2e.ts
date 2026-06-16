import 'cypress-real-events';
import 'cypress-terminal-report/src/installLogsCollector';
import './commands';

const ALLOWED_UNCAUGHT_EXCEPTION_MESSAGES: RegExp[] = [/ResizeObserver loop/];

Cypress.on('uncaught:exception', (err) => {
  return !ALLOWED_UNCAUGHT_EXCEPTION_MESSAGES.some((pattern) => pattern.test(err.message));
});
