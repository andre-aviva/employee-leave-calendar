import type { Result } from 'axe-core';

export function logA11yViolations(violations: Result[]): void {
  violations.forEach(({ id, impact, description, nodes }) => {
    cy.log(`[a11y ${impact?.toUpperCase()}] ${id}: ${description}`);
    nodes.forEach(({ html, target }) => {
      cy.log(`  Target: ${target.join(', ')}`);
      cy.log(`  HTML: ${html}`);
    });
  });
}
