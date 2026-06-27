import AxeBuilder from '@axe-core/playwright';
import { createHtmlReport } from 'axe-html-reporter';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const WCAG_22_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export async function checkA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA_TAGS).analyze();
  if (results.violations.length > 0) {
    createHtmlReport({
      results: { violations: results.violations },
      options: { outputDir: 'reports/a11y', reportFileName: 'a11y-report.html' },
    });
  }
  expect(results.violations).toHaveLength(0);
}
