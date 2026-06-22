# Audit Trail — Design

- **Date:** 2026-06-22
- **Status:** Approved (brainstorming); mechanism revised to a hand-rolled interceptor (Path C, no third-party audit library); pending implementation plan
- **Author:** Saber Karmous (with Claude)
- **arc42 ref:** §8.1 (Audit logging / GDPR for personal leave data)
- **Supersedes follow-up:** `backend-followups` — "admin-mutation traceability (who/when, before/after)"

## 1. Context & motivation

The Leave Calendar backend records leave for employees but keeps **no trace of who
changed what, when, or what the data looked like before**. The three admin mutation
slices (`AdminCreateLeave`, `AdminEditLeave`, `AdminDeleteLeave`) alter any employee's
leave and persist without capturing the actor or the prior state — none even inject
`ICurrentUser`. Issue #36 confirmed admins may *intentionally* backdate/amend historical
leave (documented in `LeaveRules`), so the policy is fine; the **missing audit trail** is
the remaining gap, and it blocks the arc42 §8.1 security sign-off.

This spec covers the **audit trail only**. The broader GDPR data-subject work
(export, erasure/anonymization, retention) is explicitly a **separate Round 2 spec**.

## 2. Scope

**In scope**
- Durable, append-only audit records for **every leave write** — admin *and* self-service:
  `AdminCreateLeave`, `AdminEditLeave`, `AdminDeleteLeave`, `RegisterMyLeave`,
  `EditMyLeave`, `DeleteMyLeave`.
- Each record captures: **actor** (who), **timestamp** (when), **action**
  (Insert/Update/Delete), the affected **registration** and **data subject**, and the
  **before/after** change set.
- A read-only **admin endpoint** to view the trail (`GET /api/admin/audit`), paged and
  filterable.

**Out of scope (deferred)**
- GDPR data-subject **export**, **erasure/anonymization**, **retention/purge**.
- **Read/access** logging (viewing a calendar or another person's sensitive leave).
- **Auth-event** logging (sign-in successes/failures).
- DB-level immutability enforcement (trigger / privilege revoke) — noted as optional hardening.

## 3. Decisions (and why)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Coverage: all leave writes** (admin + self-service) | Most defensible for a security sign-off; near-zero marginal cost with a central interceptor. |
| D2 | **Exposure: persist + admin read endpoint** | Auditors view the trail in-app, not only via direct DB access. |
| D3 | **Mechanism: hand-rolled EF Core `SaveChanges` interceptor** (no third-party audit library) | Guaranteed coverage of every write with before/after from the change tracker — and, unlike Audit.NET's EF path, it is **DI-native** (no process-wide static config) and writes the audit row in the **same transaction** (D7). Matches this repo's explicit, minimal-dependency style; ~60–80 lines we own. (Audit.NET was evaluated and dropped: its EF integration centres on the global-static `Audit.Core.Configuration` and does not enlist the audit write into the audited transaction by default — both at odds with the testability and atomicity goals.) |
| D4 | **Storage: one promoted-column + `jsonb` table** (`audit_log`) | Query columns (actor/subject/action/date) filter without jsonb gymnastics; raw change set kept as `jsonb`. |
| D5 | **Audit subsystem lives in `Web/Infrastructure/Auditing`**, not `Domain` | It's a persistence/cross-cutting concern; `Domain` stays about leave rules. |
| D6 | **Changes granularity:** changed-columns-only (old→new) for updates; full column set for inserts/deletes | Read straight from the change tracker (`PropertyEntry.IsModified`, `OriginalValue`/`CurrentValue`). Compact and fully reconstructable. |
| D7 | **Atomicity: audit row commits in the same transaction as the mutation** | No unaudited writes and no orphan audit rows — a failed audit write rolls back the mutation. |
| D8 | **Non-request writes stamp a `System` sentinel actor** | Any `LeaveRegistration` write with no authenticated HTTP context — startup paths, or test data seeded directly via the `DbContext` — has no principal; `IAuditActorProvider` reads claims directly and falls back to `System` rather than throwing. (The production seeder writes only `LeaveType`/`Employee`, so it produces no leave-audit rows; the path is real but is exercised mainly by direct-DbContext test seeding.) |
| D9 | **Redact free-text `Notes` from the stored change set** (added during whole-branch review) | `Notes` is unconstrained free text that can hold sensitive personal data (e.g. a sick-leave reason). Since `audit_log` is append-only, FK-free, and deliberately outlives the registration, capturing `Notes` verbatim would retain that data **indefinitely**, in direct tension with the GDPR §8.1 purpose of this very feature and the erasure work deferred to Round 2. So the interceptor records that `Notes` *changed* but masks its value to `"[redacted]"` (a null stays null); every other field — `Description`, dates, type, ids — is kept verbatim for "what changed to what". This minimises durable PII while preserving the trail's forensic value. (`Description` is ≤50 chars and kept; revisit if it proves to carry sensitive content.) |

### Screaming-architecture note
An interceptor is cross-cutting, so *capture* is **invisible at the individual `Handler.cs`**
— a reader of `AdminEditLeave/Handler.cs` sees no audit call. We recover "screaming" at the
**module level**: a named, first-class `Auditing` subsystem, a first-class `AuditLogEntry`
entity + `audit_log` table, and a dedicated `ViewAuditTrail` admin slice. The trade buys
**guaranteed coverage** (no write path can forget to audit) over the explicit per-handler
recorder, while — because the interceptor is ours, not a library's — keeping the capture
DI-native and same-transaction (D7).

### What "audit" captures here — effects, not intents

The interceptor fires on EF **entity state transitions** (`Insert`/`Update`/`Delete` on
`LeaveRegistration`), i.e. at the **persistence layer** — not on commands, domain events,
or API calls. This is a deliberate fit for the current architecture: although the API is
task/use-case-shaped (the slices are commands-as-intents with real `LeaveRules` logic), the
**persistence model is state-based CRUD** — there is no event store, command bus (no
MediatR), domain-event dispatch, or outbox, so the durable source of truth is just the EF
entity state. Auditing there is the cheapest place that **guarantees coverage** of every
state change. (An event-sourced/CQRS system would instead audit the command/event stream and
get intent for free.)

The trade is that we record **effects + actor**, not **intent/reason**. Be conscious of what
this *excludes*:

- **No intent/reason** — an admin edit and an owner edit both log as `Update`; they're
  distinguished only by `actor_employee_id` ≠ `subject_employee_id`, not by a recorded "why".
- **No rejected attempts** — a validation-failed write changes no row, so produces no audit
  entry; there is no "someone *tried* to do X" trail.
- **No non-mutating actions** — reads and sign-ins are not audited (access logging and
  auth-event logging are explicitly deferred, §11).

For a §8.1 sign-off on *personal leave data*, "what changed, to what, by whom" is the core
requirement, so effect-auditing is the right fit — these exclusions are an accepted,
conscious scope boundary, not an oversight.

## 4. Architecture & components

All new code lives under `src/backend/LeaveCalendar.Web/Infrastructure/Auditing/` except the
read slice (a normal feature slice) and the migration.

```
Infrastructure/Auditing/
  AuditLogEntry.cs                # the persisted audit entity
  AuditLogConfiguration.cs        # EF mapping → "audit_log" table (jsonb for changes)
  AuditActor.cs                   # value type: EmployeeId?, Name, Role  (+ System sentinel)
  IAuditActorProvider.cs          # seam: current actor, or System when no HTTP context
  AuditActorProvider.cs           # impl over IHttpContextAccessor (reads JWT claims)
  AuditSaveChangesInterceptor.cs  # the hand-rolled SaveChangesInterceptor (capture + write)
  AuditingRegistration.cs         # DI: registers the actor provider + interceptor, and the
                                  #     options hook that adds the interceptor to LeaveDbContext
Features/Admin/ViewAuditTrail/
  Endpoint.cs Handler.cs Request.cs Response.cs Validator.cs
Migrations/
  <ts>_AddAuditLog.cs
```

**Components**

- **`AuditLogEntry`** — plain persistence entity (see schema §5). Append-only; no domain behaviour.
- **`IAuditActorProvider` / `AuditActorProvider`** — returns the current `AuditActor` by
  reading JWT claims off `IHttpContextAccessor.HttpContext?.User`, or the `System` sentinel
  when there is no authenticated context. Reads claims directly (not via the scoped,
  throwing `ICurrentUser`) so it is safe to resolve from the singleton interceptor and never
  throws on the no-actor path. The single testable seam for "who".
- **`AuditSaveChangesInterceptor`** — a stateless `SaveChangesInterceptor`. In
  `SavingChanges`/`SavingChangesAsync` it walks `ChangeTracker.Entries<LeaveRegistration>()`
  for `Added`/`Modified`/`Deleted`, builds an `AuditLogEntry` per entry (before/after from
  the change tracker, actor from `IAuditActorProvider`, time from `IClock`), and **adds them
  to the same `LeaveDbContext`** so they persist in the same `SaveChanges`/transaction (D7).
  Being stateless, it resolves `IClock` + `IAuditActorProvider` from the application service
  provider at call time (`CoreOptionsExtension.ApplicationServiceProvider`), which keeps it
  compatible with Aspire's **pooled** `AddNpgsqlDbContext` (pooling forbids constructor-
  injecting services into the context).
- **`AuditingRegistration`** — DI extension: registers `IAuditActorProvider` and the
  interceptor, and adds the interceptor to `LeaveDbContext`'s options. **Note:** `ApiFactory`
  rebuilds the `LeaveDbContext` registration with a plain `AddDbContext`, so the test harness
  must add the interceptor there too (one line) — otherwise the suite runs un-audited.
- **`ViewAuditTrail` slice** — `GET /api/admin/audit`, `RequireAuthorization("Admin")`,
  `.WithTags("Admin")`, in the project's standard slice shape.

## 5. Data model

Table `audit_log`. **Naming convention** matches the existing schema: snake_case *table*
names but EF-default **PascalCase columns** (e.g. the live schema has
`leave_registrations."EmployeeId"`, and check constraints quote `"Role"` / `"RegisterableBy"`).
So the audit columns below are the EF-default PascalCase names.

| column | .NET type | DB type | notes |
|---|---|---|---|
| `Id` | `Guid` | uuid | PK |
| `OccurredAt` | `DateTimeOffset` | timestamptz | from `IClock.Now` |
| `Action` | `AuditAction` enum | varchar(20) | `Insert`/`Update`/`Delete`, stored via `HasConversion<string>()` + a `CK_audit_log_Action` check constraint — same pattern as `Role`/`RegisterableBy` |
| `EntityId` | `Guid` | uuid | the affected `LeaveRegistration.Id` |
| `SubjectEmployeeId` | `Guid` | uuid | whose leave it is (`LeaveRegistration.EmployeeId`) |
| `ActorEmployeeId` | `Guid?` | uuid null | who acted; `null` for the `System` sentinel |
| `ActorName` | `string` | varchar(200) | actor display name, or `"System"` |
| `ActorRole` | `string` | varchar(50) | actor role, or `"System"` |
| `Changes` | `string` | jsonb | change set serialized to JSON: changed columns (old→new) for updates; full column set for insert/delete. **`Notes` is masked to `"[redacted]"`** (D9) — its content is never stored. |

- **Index:** `(SubjectEmployeeId, OccurredAt)` to serve the read endpoint's primary filter+sort.
- **No foreign keys.** `EntityId`/`SubjectEmployeeId`/`ActorEmployeeId` are plain `uuid`
  columns, deliberately *not* FKs — an audit row must outlive the registration or employee it
  refers to (a deleted registration still has a durable trail).
- **Append-only:** enforced at the application layer (no update/delete code paths). A DB-level
  guard (revoke `UPDATE`/`DELETE`, or a trigger) is noted as optional future hardening.

## 6. Data flow

1. A write handler (admin or self-service) mutates `LeaveRegistration` and calls
   `db.SaveChangesAsync()` exactly as today — **handlers are not modified at all**. The
   actor is resolved out-of-band by `IAuditActorProvider` from the request principal, never
   passed in by the handler.
2. `AuditSaveChangesInterceptor.SavingChanges` fires inside that `SaveChanges`, walks the
   change tracker for `Added`/`Modified`/`Deleted` `LeaveRegistration` entries, and reads
   before/after from each entry.
3. For each entry it builds an `AuditLogEntry`: `action` from the entry state; `entity_id` /
   `subject_employee_id` from the tracked entity; `actor_*` from `IAuditActorProvider`;
   `occurred_at` from `IClock`; `changes` = the JSON-serialized change set.
4. It `Add`s those `AuditLogEntry` rows to the **same `LeaveDbContext`** before the save
   proceeds, so they commit in the **same `SaveChanges`/transaction** — atomic with the
   mutation (D7).
5. `GET /api/admin/audit` reads `audit_log`, newest-first, paged via the existing
   `PagedResult`, filterable by `subjectEmployeeId`, `action`, and a date range.

## 7. Error handling & edge cases

- **Audit write fails** → the whole `SaveChanges` (mutation + audit) rolls back; the request
  surfaces an error. No mutation is ever persisted unaudited.
- **No authenticated actor** (any non-request `LeaveRegistration` write — startup paths, or a
  test seeding rows straight through the `DbContext`) → `IAuditActorProvider` returns
  `System`; `actor_employee_id` is `null`, `actor_name`/`actor_role` are `"System"`. (The
  production seeder writes no leave rows, so this is exercised mainly by direct-DbContext test
  seeding.)
- **No self-audit / no recursion** → the interceptor only inspects
  `ChangeTracker.Entries<LeaveRegistration>()`, so the `AuditLogEntry` rows it adds are never
  themselves audited, and adding them mid-save does not re-enter the interceptor.
- **Self-service vs admin** → identical mechanism; for self-service `actor_employee_id ==
  subject_employee_id`, for admin they differ. The endpoint can thus distinguish
  "changed by an admin" from "changed by the owner".
- **Read endpoint authz** → non-admin callers get `403` (the `Admin` policy), unauthenticated
  get `401`, consistent with the other admin slices.

## 8. Testing strategy

Primary style is **integration tests** through `ApiFactory` (matches the existing suite),
with provider isolation so tests assert against the real `audit_log` table.

- **Per write path (×6):** perform the write, assert exactly one `audit_log` row with the
  correct `action`, `entity_id`, `subject_employee_id`, `actor_*`, and a `changes` payload
  reflecting the before/after.
  - Admin paths: actor = admin, subject = target employee (they differ).
  - Self-service paths: actor == subject.
- **Atomicity:** a forced failure (e.g. a constraint violation) leaves **no** `audit_log`
  row and **no** mutation (both roll back).
- **System path:** a `LeaveRegistration` written directly via the `DbContext` (no HTTP
  context) yields a `System`-attributed row (`actor_employee_id` null). This is already
  exercised by the existing `SeedRegistrationAsync`-style test helpers.
- **Read endpoint:** paging, each filter (subject / action / date range), newest-first order,
  `403` for a non-admin, `401` for anonymous.
- **Actor provider unit test:** returns the current user when authenticated, `System` when no
  HTTP context.

## 9. Migration

A single EF migration `AddAuditLog` creates `audit_log` with the columns, index, and the
`action` check constraint. Applied on startup by the existing `MigrateAsync()` path.

## 10. Dependencies

- **No new NuGet packages.** The interceptor uses only EF Core 10 (already referenced) and
  `System.Text.Json` (in the framework). Audit.NET was evaluated and dropped (see D3).

## 11. Deferred (future specs)

- **GDPR Round 2:** data-subject export, erasure/anonymization, retention + purge job
  (note the erasure-vs-audit-retention tension to resolve there).
- Read/access logging; auth-event logging.
- DB-level audit-table immutability (trigger / privilege revoke).

## References

- EF Core interceptors (incl. injecting services into an interceptor) — <https://learn.microsoft.com/en-us/ef/core/logging-events-diagnostics/interceptors>
- Audit.NET (evaluated, not used — see D3) — <https://github.com/thepirat000/Audit.NET>
