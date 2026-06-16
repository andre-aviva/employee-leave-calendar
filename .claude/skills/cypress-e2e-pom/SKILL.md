---
name: cypress-e2e-pom
description: Use when setting up, extending, or writing tests for a Cypress E2E test suite that follows a Page-Object-Model (POM) with a shared cross-app package. Covers monorepo layout (shared package + per-variant apps), POM class conventions, data-test selector helpers, typed test data, network interception/aliasing, multi-variant configuration (e.g. different tenants, brands, or locales of the same app), support file setup, and how to scaffold this structure for a new project.
---

# Cypress E2E Page-Object-Model (shared package + per-variant apps)

This skill describes a reusable architecture for Cypress E2E suites used across one
or more "variants" of the same web app — e.g. different tenants, brands, locales, or
deployment targets that share most of their UI and behavior but differ in
configuration, branding, or a handful of features. Apply this shape to any project
that needs Cypress E2E coverage for one or more deployable variants of a site.

## 1. High-level layout

```
<monorepo>/
  packages/
    e2e-test/                    # SHARED package - imported by every variant app
      src/
        constants.ts             # shared enums / regexes / string literals
        helpers/                 # small pure utility functions + cypress helpers
        pages/                   # shared Page Object classes (POM)
        testdata/                # typed fixtures describing pages/entities/etc.
        types/                   # shared TypeScript types
      package.json                # "@scope/e2e-test", exports "./*" -> "./src/*"
      tsconfig.json
  apps/
    e2e-test-<variant-a>/         # one app per deployable variant
      cypress/
        e2e/                      # spec files, organized by feature/page area
        fixtures/                 # JSON fixtures (form data, etc.)
        support/
          commands.ts
          e2e.ts
          pages/                  # variant-specific Page Object extensions
          helpers/                # variant-specific helpers
      cypress.config.ts
      cypress.env.json            # local-only secrets, gitignored
      package.json
      tsconfig.json
      README.md
    e2e-test-<variant-b>/          # same shape, different config + variant-only specs
```

Rationale:
- Anything that is **identical across variants** (page objects, constants, helpers,
  test data shapes, types) lives in the **shared package** so a behavior change only
  needs to be made once.
- Anything that is **variant-specific** (credentials, base URL, extra page-object
  methods, variant-only specs, fixtures) lives in the **per-variant app**.
- The shared package is referenced via a workspace dependency
  (`"@scope/e2e-test": "workspace:*"`) and a TS path alias, so editors get full
  type-checking and "go to definition" across packages.

If your project only ever has a single variant, you can collapse the shared package
and the single app into one Cypress project — but keep the same internal folder
split (`pages/`, `helpers/`, `testdata/`, `types/`) so it's easy to split out a
second variant later.

## 2. Shared package (`packages/e2e-test`)

`package.json` exports every file under `src/` via a wildcard export so apps can
import deep paths:

```jsonc
{
  "name": "@scope/e2e-test",
  "exports": { "./*": ["./src/*"] },
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "check": "pnpm lint && pnpm typecheck"
  }
}
```

### `src/constants.ts`
Centralizes:
- An enum of variant identifiers (e.g. `VARIANTS = { TENANT_A = 'tenant-a', TENANT_B = 'tenant-b' }`).
- An enum of repeated UI strings (`TEXTS`) so copy changes are fixed in one place.
- Enums/maps for domain status codes to human-readable messages (e.g. an order/item
  status code mapped to the label shown in the UI).
- Shared regexes (GUIDs, confirmation-message text patterns, etc.).

### `src/helpers/`
Small, focused, reusable functions, e.g.:
- `element(dataTestSelector, ...nested)` / `elementStartsWith()` / `elementEndsWith()`
  — selector builders (see section 3).
- `getVariant()` — reads the active variant via `Cypress.expose(...)` (see section 6).
- `check404Page()`, `checkOpenGraph()`, `checkDropdownState()` — reusable assertion
  blocks shared by many specs.
- Formatting/generation helpers: number/currency/date formatting, random string and
  date generation, string-to-number parsing.
- `baseUrlInclPrefix()` — builds URLs that need a locale/variant prefix.

### `src/pages/`
One class per page or region of the UI (see section 4 for conventions). Typical
examples: `Header`, `Footer`, `NavigationMenu`, `SummaryFlyout` (a small
flyout/preview of an in-progress selection), `HomePage`, `ListPage` (a page listing
many entities), `DetailPage` (a page showing one entity in depth),
`SectionLandingPage` (a landing page for a category/section), a page for the user's
in-progress selection (e.g. a cart/basket equivalent), a multi-step flow page (e.g.
checkout/onboarding/submission), `SignInPage`, `SignUpPage`,
`PasswordRecoveryPage`, and `GenericComponents` for cross-cutting widgets (buttons,
flyouts, totals/summaries, carousels, breadcrumbs, tooltips, etc.).

### `src/testdata/`
Typed constant objects describing real entities used across many specs (e.g.
`entities.ts` exporting `ENTITY_<id>`, `ENTITY_<id>_<variant>`, ...; `groups.ts`
exporting `GROUP_<id>`, ...). These objects are typed against `src/types/*` so a
spec can destructure expected UI values (title, price/value, availability/status,
SEO metadata, attribute ranges, etc.) instead of hardcoding them.

### `src/types/`
Shared TypeScript types used by both the page objects and the test data, e.g. a
detail-page scenario type, an `Seo` type, and small per-feature scenario types (see
section 5).

## 3. Selector strategy: `data-test` attributes

All page objects select elements via `data-test` attributes (never CSS classes or
text alone, except for generic native elements like `button`/`a`/`li`). Three
helpers in `helpers/element.ts`:

```ts
element('Foo')                  // [data-test="Foo"]
element('Foo', 'h2')            // [data-test="Foo"] h2
element('Foo', element('Bar'))  // [data-test="Foo"] [data-test="Bar"]
elementStartsWith('vat')        // [data-test^="vat"]
elementEndsWith('Block')        // [data-test$="Block"]
```

Page objects expose `getXxx()` methods that return `cy.get(...)` chains built from
these helpers, and `checkXxx()` / `assertXxx()` methods that compose `getXxx()` with
`.should(...)` assertions. Application code under test must add matching
`data-test="..."` attributes to the elements being targeted.

## 4. Page Object class conventions

Each page object is a **class with only `static` members** — never instantiated.
Default-exported as the class, and re-exported types/constants live alongside it.

Method naming conventions (consistent across the whole suite):

| Prefix         | Purpose                                                              |
| -------------- | --------------------------------------------------------------------|
| `visit*`       | Navigate via `cy.visit(...)`                                         |
| `get*`         | Return a `cy.get(...)` chainable for an element/region               |
| `check*`       | Compose `get*` + `.should(...)` to assert state/visibility/content   |
| `click*`       | Perform a click (and any necessary waits) on an element              |
| `set*` / `fill*` | Type into / set the value of an input or control                  |
| `setup*`       | Register `cy.intercept` aliases (e.g. `setupInterceptions()`)        |
| `waitFor*`     | `cy.wait('@alias')` wrappers, sometimes asserting on the response    |

Example skeleton:

```ts
class DetailPage {
  static visit(entityId: string, variantId?: string) {
    cy.visit(`/items/${variantId ? `${entityId}-${variantId}` : entityId}`, {
      failOnStatusCode: false,
    });
  }

  static getTitle() {
    return cy.get(element('Title'), { timeout: 6000 });
  }

  static checkDetailElements(existence: 'be.visible' | 'not.exist') {
    cy.get(element('PrimaryAction')).should(existence);
    cy.get(element('StatusIndicator')).should(existence);
  }
}

export default DetailPage;
```

### Cross-page composition
Page objects import each other when one page's flow touches another's UI (e.g.
`Header` uses `GenericComponents` and `SummaryFlyout`; a "selection summary" page
uses `DetailPage` to add an entity before testing the summary). Avoid duplicating
selectors/assertions — import and call the owning page object's methods instead.

### Multi-step flows get one page object with step-aware methods
For a multi-step flow (e.g. an onboarding wizard, checkout, or a multi-step
submission form), keep a single page object for the whole flow rather than one class
per step. Model steps as parameters/return values on shared methods, e.g.
`waitForStep1Loaded()`, `checkHeader(stepNumber)`, `waitForStep3Loaded()`. This keeps
step-transition logic (loading states, header/progress-indicator assertions) in one
place even though each step has very different field content.

### Variant-specific extensions live in the app, not the shared package
If a page needs extra behavior for only one variant (e.g. an extra pricing/quota
display only one tenant shows), put a small extension class in
`apps/<variant>/cypress/support/pages/` that imports the shared page object and adds
the variant-only methods (e.g. `VariantADetailPage extends DetailPage` with
`checkVariantOnlyField()`). Specs in that app import the shared page for common
checks and the extension for variant-only checks.

## 5. Typed test data driving parametrized specs

Define a TypeScript type describing everything a spec might assert about an entity
(e.g. a `DetailPageTestEntity` type describing title, value/price, availability,
attribute ranges, SEO, images, etc.), then export named constants of that type
(`ENTITY_A`, `ENTITY_B`, ...). Specs then do:

```ts
const scenarios = [
  { description: TEXTS.SINGLE_VARIANT, entity: ENTITY_A, visibleAction: 'PrimaryAction' },
  { description: TEXTS.MULTI_VARIANT_NONE_SELECTED, entity: ENTITY_B, visibleAction: 'ActionWithVariantSelector' },
];

scenarios.forEach(({ description, entity, visibleAction }) => {
  describe(`Detail page - primary action - ${description}`, () => {
    beforeEach(() => {
      signInPage.clearBrowserAndSignIn();
      detailPage.visit(entity.entityId, entity.variantId);
    });

    it(`${visibleAction} is visible`, () => { /* ... */ });
  });
});
```

This keeps specs short, makes new scenarios cheap to add (just add another typed
object), and keeps "what the UI should show for entity X" co-located in `testdata/`.

Don't force every feature area into one giant type. Define a **separate, narrowly-
scoped scenario type per feature** (e.g. a detail-page-visit scenario, a
comparison-widget scenario, a "should/shouldn't appear in search results"
scenario) so each type only carries the fields that feature actually needs.

## 6. Multi-variant configuration (`Cypress.expose`)

Each variant app's `cypress.config.ts` sets a small `expose` block identifying the
variant, and a shared helper reads it:

```ts
// apps/e2e-test-<variant>/cypress.config.ts
export default defineConfig({
  e2e: {
    expose: { variant: 'tenant-a' },
    env: {
      TARGET_USERNAME: process.env.CYPRESS_TARGET_USERNAME_TENANT_A,
      TARGET_PASSWORD: process.env.CYPRESS_TARGET_PASSWORD_TENANT_A,
    },
    baseUrl: 'https://tst.example-tenant-a.com',
  },
});
```

```ts
// packages/e2e-test/src/helpers/getVariant.ts
export function getVariant(): 'tenant-a' | 'tenant-b' {
  const variant = Cypress.expose('variant');
  if (variant === 'tenant-a' || variant === 'tenant-b') return variant;
  throw new Error(`Invalid or missing Cypress.expose("variant"): ${variant}`);
}
```

Shared page objects branch on `getVariant()` (or an equivalently-named helper) to
render variant-appropriate assertions (different nav items, different layouts,
different copy) without needing separate page object classes for every variant.
Reserve a real "extension class" (section 4) only when a variant has genuinely extra
UI/behavior, not just different copy/values.

## 7. Common `cypress.config.ts` conventions

```ts
import { defineConfig } from 'cypress';
import installLogsPrinter from 'cypress-terminal-report/src/installLogsPrinter';

export default defineConfig({
  chromeWebSecurity: false,
  taskTimeout: 180000,
  video: false,
  retries: { openMode: 2, runMode: 2 },
  viewportWidth: 1920,
  viewportHeight: 1080,
  allowCypressEnv: false,
  e2e: {
    env: { /* secrets pulled from process.env (CI) */ },
    expose: { /* variant identifier(s) */ },
    experimentalMemoryManagement: true,
    baseUrl: 'https://tst.example.com',
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
    },
    testIsolation: false,
  },
});
```

`cypress.env.json` (gitignored) holds local credentials for `TARGET_USERNAME` /
`TARGET_PASSWORD`-style env vars; CI supplies them via real environment variables
read in `cypress.config.ts`.

## 8. Support files

### `cypress/support/e2e.ts`
- Install `cypress-terminal-report`'s log collector.
- Register `cypress-real-events`.
- Stub third-party/analytics network calls that would otherwise hit production
  endpoints during tests (`cy.intercept` to a fixed 200 response in a global
  `beforeEach`).
- Add a global `Cypress.on('uncaught:exception', ...)` handler that returns `false`
  (swallow) only for a **known allowlist** of noisy errors (e.g. ResizeObserver loop
  errors, third-party chunk-load errors), and otherwise lets errors fail the test.

### `cypress/support/commands.ts`
Custom commands (`Cypress.Commands.add(...)`) for variant-specific reusable actions.

### Known gotcha (document in README)
Errors thrown in `before()`/`beforeEach()` (e.g. `Failed to fetch` from a previous
test's in-flight requests being cancelled) can fail the *next* test. Since the error
message is too generic to allow-list safely, the fix is to **wait for in-flight
requests to settle inside the test itself** (e.g.
`cy.wait(['@getAsyncWidgetData', ...])`) rather than trying to suppress the resulting
exception.

## 9. Network interception & aliasing pattern

Centralize all `cy.intercept(...).as('alias')` calls in one method (e.g.
`GenericComponents.setupInterceptions()`), called from a sign-in/setup helper at the
start of relevant specs. Naming convention for aliases: `<method><Resource>`, e.g.
`getUserProfile`, `postItem`, `putSetting`, `deleteCollection`.

Specs then synchronize on backend calls instead of arbitrary waits:

```ts
cy.wait(['@getUserProfile', '@getNavigationMenu', '@getPendingApprovals']);
```

and can inspect intercepted responses to make decisions (e.g. "if the user's
in-progress selection already has entries, clear it first"):

```ts
static waitForGetCollectionAndClearIfNeeded() {
  this.waitForGetCollection().then((interception) => {
    if (interception.response?.body.items?.length) {
      this.clearCollection();
    }
  });
}
```

## 10. Handling flaky/async UI: `cypress-recurse`

For UI that updates asynchronously after a hover/click (flyouts, counters,
animations), use `cypress-recurse`'s `recurse()` to poll until a condition is true
rather than adding fixed `cy.wait(ms)`:

```ts
recurse(
  () => element.should(Cypress._.noop).then(($el) => { /* trigger again if needed */ }),
  ($el) => $el.length === expectedLength,
  { delay: 200 },
);
```

## 11. Reusable widget-assertion & form-control helpers

Beyond page-specific selectors, keep small **generic** helpers for common UI widget
patterns that recur across many pages, parameterized by selector/index rather than
hardcoded to one page:

- `checkDropdownState(subject, 'open' | 'closed')` — asserts a dropdown's open/closed
  state via a CSS-class convention (e.g. presence/absence of a `closed` class).
- `verifySelectOptions(containerIndex, labelText, expectedOptions)` /
  `selectOption(containerIndex, value)` — assert/interact with native `<select>`
  dropdowns by index within a repeated container.
- `verifyAutoSuggest(results)` — type into a search/autosuggest input and assert the
  resulting suggestion list (text + href per item).

These live in shared `helpers/` (not in any single page object), since they operate
on generic widget shapes any page can reuse.

## 12. Computing expected values with business-logic-replication helpers

For pages with non-trivial calculated values (tiered values, totals, conditional
adjustments), add a small **pure-function helper** that re-implements the same
calculation rule the app uses, given the same typed test-data inputs, e.g.:

```ts
getExpectedTieredValue(
  selectedQuantity, tiersVariantA, tiersVariantB, fallbackValue, variantAOverride,
): string
```

Specs call this helper to compute the *expected* displayed value, then assert the
UI matches it — instead of hardcoding a precomputed string that silently goes stale
when test data changes. Put variant-specific calculation helpers in
`apps/<variant>/cypress/support/helpers/`; put shared ones in the shared package's
`helpers/`.

## 13. Test data & setup helpers for complex flows (fixtures + conditional setup)

- **Fixtures** (`cypress/fixtures/*.json`) hold structured data for multi-field forms
  used repeatedly across multi-step-flow and account specs, e.g. `defaultAddress.json`,
  `addressVariant1.json`, `addressVariant2.json`. Load with `cy.fixture('name')` and
  feed the result into page-object fill methods. One fixture per "persona" / data
  variant keeps specs readable and avoids inline literal objects.
- **Conditional setup helpers** encapsulate "do X only if this scenario's test data
  requires it" — e.g. an `applyOptionalAdjustmentsIfNeeded(adjustments, checkOn)`
  helper that reads a list of optional adjustments (this is the same pattern used
  for things like discount/promo codes in an e-commerce app, or feature-flag toggles
  in a SaaS app) from the scenario's test data, filters for entries that need extra
  setup, and applies each via the relevant page object *before* the spec's main
  assertions run. Pair with an `assertAdjustmentInfo(adjustment)` helper that asserts
  the resulting "value after adjustment" label/value. This keeps scenario-driven
  specs declarative: the test data says *what* should happen, a setup helper makes
  it happen, and an assertion helper checks the result.

## 14. API-level / non-UI assertions via `cy.request`

Not everything needs a browser. Use `cy.request(...)` directly against backend
endpoints for:

- **Headers / infra checks** — e.g. assert a CDN/edge cache header
  (`x-vercel-cache: HIT`) on a second request to the same URL.
- **Static text endpoints** — e.g. `robots.txt`: split the response body into lines
  and assert the expected `Disallow` / `Sitemap` entries are present (and that the
  total line count matches, so nothing extra slipped in).
- **Domain rules independent of UI rendering** — e.g.
  `assertAvailableOptions(response, expectedTypes)` calls an options/availability
  API directly and asserts which option `type`s are `isAvailable`, driven by a typed
  list per scenario. Add small predicate helpers (`includesOptionA`,
  `includesOptionB`, `onlyIncludes`, ...) so specs can branch *UI* assertions on the
  same expected-options list used for the API assertion.

Authenticate these requests the same way the UI session does (e.g. sign in via
`cy.request` to an auth endpoint first — see `SignInPage.signInUsingApi()`), and pass
any variant-identifying headers (e.g. `X-<App>-Variant: ${getVariant()}`) the
backend needs.

## 15. SEO & structured-data assertions

Group SEO-related specs under `cypress/e2e/seo/` and keep small composable helpers
in the shared package:

- `checkOpenGraph(property, validationFn?)` — reads `<meta property="og:...">`
  content and optionally runs extra validation on it.
- `determineEntityRelativeUrl(slug, sectionPath?, variantId?)` /
  `determineCanonical(...)` — build the *expected* relative/absolute URL for an
  entity from its test-data fields (section path, slug, variant id), so
  canonical-link assertions don't hardcode URLs.
- **Structured data (JSON-LD)** — `cy.get('script[id="..."]').invoke('text')`,
  `JSON.parse(...)`, then assert on the resulting object's fields (`@type`, `name`,
  `contactPoint`, `sameAs`, ...).
- **`robots.txt` / `sitemap.xml`** — see section 14.
- Each entity's `seo` test-data field (typed via a shared `Seo` type: `title`,
  `description`, `keywords`, `canonical`, `robots`) feeds a generic
  `checkMetadata(seo)`-style assertion reused across pages.

## 16. Analytics / tag-manager validation

For tag-manager/analytics validation:

1. Assert the tag-manager script tag is present:
   `cy.get('script[src*="...tagmanager.js?id=<ID>"]').should('exist')`.
2. `cy.intercept` the analytics collector endpoint (e.g.
   `**/collect?v=2&tid=<MEASUREMENT_ID>*`) and alias it.
3. Trigger the page load/action, `cy.wait('@alias')`, then parse
   `interception.request.url` with `URLSearchParams` to assert on tracked
   parameters (page location, page title, event name, etc.).

Keep tag/measurement IDs as named constants at the top of the spec (they're
variant-specific) rather than hardcoding them inline repeatedly.

## 17. TypeScript project setup

- `packages/e2e-test/tsconfig.json` extends the shared base tsconfig.
- Each app's `tsconfig.json` adds a path alias to the shared package's source and
  declares Cypress-related type packages:

```jsonc
{
  "extends": "@scope/tsconfig/base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "types": ["cypress", "node", "cypress-terminal-report", "cypress-recurse", "cypress-real-events"],
    "paths": {
      "~/*": ["./cypress/*"],
      "@scope/e2e-test/*": ["../../packages/e2e-test/src/*"]
    },
    "allowImportingTsExtensions": true
  },
  "include": ["**/*.ts", "./cypress.config.ts"]
}
```

- App `package.json` depends on the shared package via `"@scope/e2e-test": "workspace:*"`.

## 18. Linting & formatting conventions

- Both the shared package and each app's `.eslintrc.cjs` extend a shared base config
  (e.g. `@scope/eslint-config-custom/base`) and add the `mocha` plugin with a rule
  such as `mocha/consistent-spacing-between-blocks` for consistent spec formatting.
- `parserOptions.project` points at the **Cypress-specific** `tsconfig.json` (e.g.
  `cypress/tsconfig.json`, which extends the app's root `tsconfig.json`) so
  type-aware ESLint rules resolve the right `types`/`paths`.
- `.prettierrc.js` re-exports a shared Prettier config (e.g.
  `@scope/eslint-config-custom/prettier.js`) so formatting is identical across the
  shared package and every variant app.
- `.gitignore` excludes `cypress.env.json` (local secrets), `cypress/downloads`,
  `cypress/videos`, `cypress/screenshots`, and any generated report directories.

## 19. Spec organization

Group spec files under `cypress/e2e/<feature-area>/` mirroring the site's page/region
structure, e.g.: `404/`, `500/`, `account/`, `selectionSummary/` (a cart/basket-like
page), `sectionLandingPage/`, `multiStepFlow/` (checkout/onboarding/submission),
`footer/`, `forgotPassword/`, `generic/` (cross-cutting: rendering, navigation,
discoverability), `analytics/`, `header/`, `homepage/`, `navigationMenu/`,
`summaryFlyout/`, `detailPage/` (with nested folders per sub-feature, e.g.
`<subFeature>/desktop` & `<subFeature>/mobile`), `listPage/`, `routing/`, `seo/`,
`signin/`, `signup/`. Variant-only spec areas (e.g. tenant-A-only
`account/teamSettings.cy.ts`, `account/usageReport.cy.ts`) live only in that
variant's app.

## 20. Package scripts

Both the shared package and each app expose:

```jsonc
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "check": "pnpm lint && pnpm typecheck",
    "open": "cypress open",
    "open:e2e": "cypress open --e2e",
    "open:e2e:chrome": "cypress open --e2e --browser chrome",
    "headless": "cypress run",
    "headless:e2e": "cypress run --e2e",
    "headless:e2e:chrome": "cypress run --e2e --browser chrome"
  }
}
```

## 21. Scaffolding checklist for a new project

When asked to set up this pattern for a new project (single variant or multiple):

1. Create `packages/e2e-test` (or similar) shared package with `src/{constants.ts,
   helpers/, pages/, testdata/, types/}`, wildcard `exports`, and a `tsconfig.json`
   extending the repo base config.
2. For each deployable variant, create `apps/e2e-test-<variant>` with
   `cypress/{e2e/, fixtures/, support/{commands.ts, e2e.ts, pages/, helpers/}}`,
   `cypress.config.ts` (variant `baseUrl`, `expose`, env-derived credentials),
   `cypress.env.json` (gitignored), `package.json` (workspace dep on the shared
   package + standard scripts), `tsconfig.json` (path alias to shared `src/`), and a
   `README.md` documenting required env vars and any test-flakiness gotchas.
3. Add a `getVariant()`-style helper to the shared package if more than one variant
   exists, so shared page objects can branch on it.
4. Build out shared page objects bottom-up: start with cross-cutting
   `GenericComponents` (buttons, flyouts, totals, breadcrumbs) plus `element()` /
   `elementStartsWith()` / `elementEndsWith()` helpers, then add one page object per
   page/region as specs are written.
5. Add `data-test="..."` attributes to the application's components matching the
   selectors used by the page objects.
6. Centralize `cy.intercept(...).as(...)` registrations in one
   `setupInterceptions()`-style method; call it from a shared sign-in/setup helper.
7. Write specs grouped by feature area (section 19), preferring typed test-data
   objects + `.forEach` over copy-pasted near-duplicate specs.
8. Add fixtures (section 13) for any multi-field form data, conditional setup /
   assertion helper pairs (section 13) for optional scenario behaviors, and
   business-logic-replication helpers (section 12) for any calculated values shown
   in the UI.
9. Add `cy.request`-based specs (section 14) for cache/header/robots checks and any
   domain rules that don't need a browser, plus SEO (section 15) and
   analytics/tag-manager (section 16) specs if relevant.
10. Wire up shared ESLint/Prettier configs and the Cypress-specific tsconfig
    (section 18) so lint/typecheck pass from the start.
