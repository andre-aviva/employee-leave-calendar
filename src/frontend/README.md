# Frontend, Leave Calendar SPA

Single-page app: React 19, TypeScript, React Router, SCSS Modules, plain fetch. No global state library (component-local useState/useReducer). Forms use react-hook-form.

Folder structure mirrors the backend's screaming architecture (feature-aligned).

- `src/components/`: UI by family (core, forms, layout, calendar, leave, admin).
- `src/pages/`: one folder per route page (SignIn, Calendar, MyLeave, AdminLeave).
- `src/router/`: React Router route definitions and route guards.
- `src/api/`: thin fetch wrapper per API resource (attaches Bearer token, maps 422 codes up, redirects on 401).
- `src/utils/`: shared utilities, including `formatDate.ts` (ISO YYYY-MM-DD to and from UI DD-MM-YYYY).

## Conventions

Named exports and function declarations only (no default exports). Typed `ComponentNameProps`. User-visible strings and 422 code mappings live in a co-located `ComponentName.resources.ts`. SCSS Modules use design-system variables and mixins only (no hardcoded colours or sizes; min-width breakpoint mixins only). Semantic HTML, WCAG 2.2 AA. Every interactive and content-bearing element carries a `data-test` attribute (`[Component]_[Element]`).

Each component directory contains: `ComponentName.tsx`, `ComponentName.module.scss`, `ComponentName.resources.ts`, `ComponentName.stories.tsx`, `exampleData.ts`.

## Current state

`src/App.tsx` is a minimal wiring-check page (verifies the API is reachable through the Vite proxy). Build the real pages/components per the conventions above; replace `App.tsx` as the app grows.

Run standalone (against a running API): `npm install && npm run dev`. Under `aspire run` the backend URL is injected automatically; standalone, set `VITE_API_URL` in `.env`.
