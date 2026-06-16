# Employee Leave Calendar — Working Plan

## Reference docs (Confluence, ELC space)
- [System Architecture (arc42)](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/3506190)
- [Backend Architecture](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/458756)
- [Functional requirements](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143425)
- Pages: [Sign In](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143453), [Base Layout](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143471), [Calendar Overview](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143497), [My Leave](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143523), [Leave Management](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143549)
- Components: [Navigation Bar](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143593), [Employee Leave Chip](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143619), [Leave Type Badge](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143637), [Confirmation Dialog](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143657)
- Data Model: [Employee](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143712), [Leave Registration](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143730), [Leave Type](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143750)

## Current state
- Repo: only README/LICENSE + `.claude` config (QA rules, cypress-e2e-pom skill) — no frontend app yet
- `tests/`: Cypress E2E scaffold created (pnpm, TS 6, ESLint flat config, cypress-real-events,
  cypress-terminal-report, baseUrl placeholder `http://localhost:3000`)

## Open decisions
- `cypress.config.ts` baseUrl needs updating once the frontend dev server exists.

## Confirmed tech stack (arc42)
- Frontend: React 19 + TypeScript, React Router, SCSS Modules, plain `fetch`
- Backend: .NET 10, Vertical Slice Architecture, PostgreSQL

## E2E conventions to apply
- `data-test` naming: `[Component]_[Element]` (e.g. `SignIn_UsernameInput`)
- Stable 422 error codes: `OVERLAP`, `TYPE_NOT_REGISTERABLE`, `START_DATE_IN_PAST`
- Dates: DD-MM-YYYY in UI, ISO `YYYY-MM-DD` on the wire, Europe/Amsterdam timezone

## Backlog (once frontend app exists)
- [ ] Page objects: SignInPage, CalendarPage, MyLeavePage, AdminLeavePage
- [ ] Shared component objects: NavigationBar, EmployeeLeaveChip, LeaveTypeBadge, ConfirmationDialog
- [ ] Typed test data: Employee, LeaveType, LeaveRegistration
- [ ] Specs grouped by feature area per skill §19