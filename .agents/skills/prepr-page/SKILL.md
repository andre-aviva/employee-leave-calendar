---
name: prepr-page
description: "Use when a developer wants to connect a Prepr CMS model to a Next.js page. Guides through creating the page file, writing the GraphQL query with correct cache tags, asking which UI components to use, and binding the CMS data to those components."
---

You are helping a developer wire a Prepr CMS model to a Next.js page. Work through the steps below **in order**, one step at a time, waiting for the developer to confirm or provide information before moving on.

---

## Step 1 — Establish the page route

Ask the developer (if not already clear from their message):

1. Which **app** does the page belong to? List the available apps by reading `frontend/apps/` and present them as options.
2. What is the **page route**? (e.g. `/nieuws/[slug]`, `/evenementen/[slug]`, `/over-ons`)

Derive the page file path from the route:

- `frontend/apps/<app>/src/app/<route>/page.tsx`

Create the file with a minimal async server component placeholder:

```tsx
export default async function <PageName>Page() {
  return <></>;
}
```

---

## Step 2 — Write the GraphQL query

Queries and fetch functions live in the shared `@repo/website` package, not in the app:

```
frontend/packages/website/src/prepr/queries/<pageName>.ts
```

This package uses [gql.tada](https://gql-tada.0no.co) for GraphQL types — no codegen step, types are inferred at compile time from `schema.graphql`.

Follow this exact structure:

```ts
import type { ResultOf } from 'gql.tada';
import { graphql } from 'gql.tada';
import { cacheLife, cacheTag } from 'next/cache';
import { getCacheItemTag, getCacheModelTag } from '../cacheTags';
import { createClient } from '../graphqlClient';

export const <PageName>Details = graphql(`
  fragment <PageName>Details on <PreprModelName> {
    __typename
    _id
    # fields needed by the page
  }
`);

const Get<PageName> = graphql(
  `
    query Get<PageName>($slug: String!) {
      <PreprModelName>(slug: $slug) {
        ...<PageName>Details
      }
    }
  `,
  [<PageName>Details],
);

export async function fetch<PageName>(
  accessToken: string,
  slug: string,
): Promise<NonNullable<ResultOf<typeof Get<PageName>>['<PreprModelName>']> | null> {
  'use cache';
  cacheLife('hours');

  const client = createClient(accessToken);
  const data = await client.request(Get<PageName>, { slug });

  if (!data.<PreprModelName>) return null;

  cacheTag(getCacheItemTag(data.<PreprModelName>._id));
  cacheTag(getCacheModelTag('<PreprModelName>'));

  return data.<PreprModelName>;
}
```

### Fragment naming

Fragment variable names use the pattern `<Name>Details` — no `FragmentDoc` suffix. The variable name and the GraphQL fragment name must match:

```ts
export const QuoteBlockDetails = graphql(`
  fragment QuoteBlockDetails on QuoteBlock { ... }
`);
```

### Composite fragments

When a fragment spreads another fragment, list the dependencies explicitly as the second argument. TypeScript will error if a spread fragment is missing from this array:

```ts
import { LinkDetails } from '../components/link';

export const CtaBannerDetails = graphql(
  `
    fragment CtaBannerDetails on CTABanner {
      link {
        ...LinkDetails
      }
    }
  `,
  [LinkDetails],
);
```

### Cache tag rules

Prepr has two distinct concepts — **models** and **components** — and only models need cache tags.

| Prepr concept | Description | Cache tags needed? |
|---|---|---|
| **Model** | A standalone content item with its own publish lifecycle (e.g. `NewsArticle`, `Page`, `NewsCategory`) | Yes |
| **Component** | An embedded structure inside a model, with no independent publish lifecycle (e.g. `CTABanner`, `NewsHeader`, `CheckList`) | No |

For every **model** touched, apply two cache tags:

| Tag | Helper | When to apply |
|---|---|---|
| Item tag | `getCacheItemTag(data.<PreprModelName>._id)` | Always — invalidates this specific item on publish |
| Model tag | `getCacheModelTag('<PreprModelName>')` | Always — invalidates all pages of this model type |

> **Always** pass a hardcoded type name string (matching the GraphQL schema singular type name) to `getCacheModelTag` — e.g. `getCacheModelTag('NewsArticle')`. Do **not** use `response.__typename`: it only works when a response item exists and silently omits the model tag for empty responses (e.g. when no items have been published yet).

If the model references **other Prepr models** (e.g. categories, authors, related articles), add an item tag for each referenced model's `_id` as well. The pattern is to export a `getCacheTags()` helper from the model transformer that returns those tags, then call it in the query: `cacheTag(...getCacheTags(data.<PreprModelName>))`. See `packages/website/src/prepr/models/newsArticle.ts` for an example.

> **Do not** add cache tags for Prepr **components** — they have no independent publish lifecycle and are invalidated when their parent model is published.

### Conditional Prepr components

Some Prepr models have optional linked components (e.g. `cta_banner`, `faq_section`) controlled by a boolean flag (`show_cta_banner`, `show_faq_section`). **Do not** include these in the main query — Prepr's strict validation rejects the query when the linked component's required fields are incomplete, even when the component is not shown.

Use a **two-step fetch** instead:

1. The main query fetches the model **without** the optional components, but **with** the boolean flags.
2. Separate queries for each optional component run conditionally via `Promise.all`, only when the flag is true.

Define the composed return type explicitly to satisfy `@typescript-eslint/explicit-module-boundary-types`:

```ts
import type { ResultOf } from 'gql.tada';

// Separate queries for optional components
const GetCtaBanner = graphql(`
  query GetCtaBanner($slug: String!) {
    Page(slug: $slug) {
      cta_banner { ...CtaBannerDetails }
    }
  }
`, [CtaBannerDetails]);

// Compose the return type from all three queries
type PageData = NonNullable<ResultOf<typeof GetPage>['Page']> & {
  cta_banner: NonNullable<ResultOf<typeof GetCtaBanner>['Page']>['cta_banner'];
};

export async function fetchPage(accessToken: string, slug: string): Promise<PageData | null> {
  'use cache';
  cacheLife('hours');

  const client = createClient(accessToken);

  // Step 1 — fetch without optional components; include the show_* flags
  const data = await client.request(GetPage, { slug });
  if (!data.Page) return null;

  // Step 2 — fetch optional components in parallel only when enabled
  const [ctaBannerData] = await Promise.all([
    data.Page.show_cta_banner ? client.request(GetCtaBanner, { slug }) : null,
  ]);

  return {
    ...data.Page,
    cta_banner: ctaBannerData?.Page?.cta_banner ?? null,
  };
}
```

> **When does this apply?** Only when the Prepr model has boolean flags that control whether linked components are shown. Required fields that are always present can be fetched in the main query as usual.

After writing the file, validate the GraphQL document against the schema:

```bash
cd frontend/packages/website && pnpm exec tsc --noEmit
```

Use `packages/website/src/prepr/gql/schema.graphql` to look up correct field names and types — do not make live API calls. Fix any errors and re-run until it passes.

Then apply ESLint autoformatting:

```bash
cd frontend/packages/website && pnpm run lint:fix
```

Run `lint:fix` after **every** TypeScript file you create or edit in the package — not just at the end.

---

## Step 3 — Identify the UI components

Tell the developer:

> The UI components for this page are defined in an external spec (Confluence). Please share which component(s) should be used on this page so I can wire them up.

Wait for the developer's answer before continuing.

---

## Step 4 — Create transformer modules (if needed)

### Determine the Prepr type category

Transformers live in **`packages/website/src/prepr/`**, not in the app. Before creating a transformer, look up the Prepr type in `packages/website/src/prepr/gql/schema.graphql` to determine which directory it belongs in:

| Schema declaration | Category | Directory |
|---|---|---|
| `type Foo implements Model` | Model | `packages/website/src/prepr/models/` |
| `type Foo implements Component` | Component | `packages/website/src/prepr/components/` |
| `enum Foo` | Enum | `packages/website/src/prepr/enums/` |

> **Note:** Prepr types that implement neither `Model` nor `Component` (e.g. `Text`) are treated as components and placed in `packages/website/src/prepr/components/`.

First check whether a transformer for the type already exists in `packages/website/src/prepr/`. If it does, import from `@repo/website/prepr/components/<name>` (or `models/` / `enums/`) in the page — no new file needed.

If a new transformer is needed, create it in the package and run tsc and lint:fix:

```bash
cd frontend/packages/website && pnpm exec tsc --noEmit
cd frontend/packages/website && pnpm run lint:fix
```

### Transformer pattern

For each UI component that receives CMS data, check whether a transformer already exists in the correct directory. If not, create one following this pattern:

```ts
import type { <ComponentName>Props } from '@repo/ui/components/.../<ComponentName>';
import type { FragmentOf } from 'gql.tada';
import { graphql, readFragment } from 'gql.tada';

export const <PreprTypeName>Details = graphql(`
  fragment <PreprTypeName>Details on <PreprTypeName> {
    # fields needed by this component
  }
`);

export function to<ComponentName>Props(
  fragment: FragmentOf<typeof <PreprTypeName>Details>,
): <ComponentName>Props {
  const data = readFragment(<PreprTypeName>Details, fragment);

  return {
    // map Prepr fields to component props
  };
}
```

Key points:
- Import `graphql` and `readFragment` from `'gql.tada'`, not from `'../gql'`
- Use `FragmentOf<typeof X>` (not `FragmentType<typeof X>`) for the parameter type
- Use `readFragment(Doc, fragment)` (not `getFragmentData(Doc, fragment)`) to unmask
- Fragment variable name equals the GraphQL fragment name — no `FragmentDoc` suffix

Add the fragment spread to the page-level fragment in the query file (Step 2):

```graphql
fragment <PageName>Details on <PreprModelName> {
  __typename
  _id
  some_field {
    ...<PreprTypeName>Details
  }
}
```

And add the fragment variable to the deps array of the query's `graphql()` call:

```ts
const Get<PageName> = graphql(
  `query Get<PageName>($slug: String!) { ... }`,
  [<PageName>Details, <PreprTypeName>Details],
);
```

After creating or editing any TypeScript file in the package, run ESLint autoformatting:

```bash
cd frontend/packages/website && pnpm run lint:fix
```

---

## Step 5 — Bind data to the page

Update the page component. The page passes `env.PREPR_ACCESS_TOKEN` to the fetch function (the access token is always provided by the app, not the package). The fetch function returns the already-unwrapped model data — no `readFragment` call needed in the page:

```tsx
import { notFound } from 'next/navigation';
import { <ComponentName> } from '@repo/ui/components/.../<ComponentName>';
import { to<ComponentName>Props } from '@repo/website/prepr/components/<componentName>';
import { fetch<PageName> } from '@repo/website/prepr/queries/<pageName>';
import { env } from '~/lib/env';

export default async function <PageName>Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await fetch<PageName>(env.PREPR_ACCESS_TOKEN, slug);

  if (!page) return notFound();

  return (
    <<ComponentName>
      {...to<ComponentName>Props(page)}
    />
  );
}
```

After editing the page file, run ESLint autoformatting from the app directory:

```bash
cd frontend/apps/<app> && pnpm run lint:fix
```

---

## Checklist before finishing

- [ ] Page file created at the correct route in `frontend/apps/<app>/src/app/`
- [ ] Query file in `packages/website/src/prepr/queries/` with `'use cache'` and `cacheLife('hours')`
- [ ] Fetch function accepts `accessToken: string` as first parameter and uses `createClient(accessToken)`
- [ ] Fragment variable name matches the GraphQL fragment name — no `FragmentDoc` suffix
- [ ] All imports from `'gql.tada'` — not from `'../gql'` or `'../gql/graphql'`
- [ ] `readFragment` used (not `getFragmentData`), `FragmentOf` used (not `FragmentType`)
- [ ] Every `graphql()` call that spreads another fragment passes deps as second argument: `graphql('...', [dep1, dep2])`
- [ ] Both `getCacheItemTag` and `getCacheModelTag` applied for every Prepr **model** touched (not components)
- [ ] Referenced Prepr **models** (categories, authors, etc.) also get an item cache tag via a `getCacheTags()` helper
- [ ] `pnpm exec tsc --noEmit` passes in the package (no codegen step needed)
- [ ] ESLint autoformatting applied after every TS file edit in the package (`pnpm run lint:fix` from `frontend/packages/website`) and in the app (`pnpm run lint:fix` from `frontend/apps/<app>`)
- [ ] Transformer module(s) created in `packages/website/src/prepr/` in the correct subdirectory (`models/`, `components/`, or `enums/`) based on the Prepr type in `packages/website/src/prepr/gql/schema.graphql`
- [ ] Page imports query and transformers from `@repo/website/prepr/...`, not from `~/lib/cms/`
- [ ] Page passes `env.PREPR_ACCESS_TOKEN` as first argument to the fetch function
- [ ] Page renders the correct UI components with CMS-derived props
- [ ] `notFound()` returned when the CMS item does not exist
- [ ] Optional linked components controlled by boolean flags use the two-step fetch pattern (main query + conditional `Promise.all`) — do not include them in the main query
