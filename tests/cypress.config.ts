import { defineConfig } from 'cypress';
import installLogsPrinter from 'cypress-terminal-report/src/installLogsPrinter';
import { createHtmlReport } from 'axe-html-reporter';

export default defineConfig({
  chromeWebSecurity: false,
  taskTimeout: 180000,
  video: false,
  retries: { openMode: 0, runMode: 2 },
  viewportWidth: 1920,
  viewportHeight: 1080,
  e2e: {
    baseUrl: 'http://localhost:3000',
    defaultCommandTimeout: 10000,
    requestTimeout: 20000,
    pageLoadTimeout: 60000,
    setupNodeEvents(on) {
      installLogsPrinter(on, { printLogsToConsole: 'onFail' });
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.args.push('--js-flags=--max-old-space-size=4096');
        }
      });
      on('task', {
        generateA11yReport(violations: import('axe-core').Result[]) {
          createHtmlReport({
            results: { violations },
            options: { outputDir: 'cypress/reports/a11y', reportFileName: 'a11y-report.html' },
          });
          return null;
        },
      });
    },
  },
});
