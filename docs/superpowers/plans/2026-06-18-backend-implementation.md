# Employee Leave Calendar — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Git is part of every step.** Each numbered **PR** below is one GitHub-Flow unit: branch off an up-to-date `main`, make the atomic commits inside it, open a PR against `main`, and squash-merge it before starting the next PR. Follow `.claude/skills/git-workflow/SKILL.md` exactly.

**Goal:** Build the Leave Calendar Web API — authentication, authorisation, all leave business rules, and persistence — as a Vertical-Slice/Screaming .NET 10 backend, delivered PR by PR with a green test suite at every merge.

**Architecture:** A framework-free `LeaveCalendar.Domain` core holds the entities and the shared invariants (`LeaveRules`). `LeaveCalendar.Web` holds one minimal-API slice per use-case under `Features/`, with EF Core 10 + PostgreSQL persistence, JWT auth, and ProblemDetails error handling. Domain rules are unit-tested with no DB; endpoints are integration-tested against real PostgreSQL via Testcontainers.

**Tech Stack:** .NET 10 (LTS), ASP.NET Core minimal APIs, EF Core 10, Npgsql, PostgreSQL, FluentValidation, JWT bearer (HS256), BCrypt password hashing, Serilog, Swashbuckle (OpenAPI/Swagger), xUnit + FluentAssertions, Testcontainers.

**Source documents:**
- [System Architecture (arc42)](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/3506190)
- [Backend Architecture](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/458756) (the binding contract)
- [Functional requirements](https://aviva-ai-demo.atlassian.net/wiki/spaces/ELC/pages/7143425)

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the architecture.

- **Platform:** .NET 10 (LTS), ASP.NET Core, EF Core 10, PostgreSQL in **all** environments (incl. tests). C# `nullable` enabled, `ImplicitUsings` enabled, file-scoped namespaces.
- **Style:** Vertical Slice + Screaming. One folder per use-case under `Features/`. **No** `Controllers/`, `Services/`, or `Repositories/` folder. A slice **never** depends on another slice. Adding a feature = adding a folder (endpoints self-register; never edit a central router).
- **Shared rules:** All business invariants live **once** in `LeaveCalendar.Domain` (`LeaveRules`). The four write slices (RegisterMyLeave, EditMyLeave, AdminCreateLeave, AdminEditLeave) call into them — never re-implement.
- **Contracts:** Per-slice `Request`/`Response` records. **Never** expose EF entities over the wire (no over-posting).
- **Dates:** Leave dates are `DateOnly` (whole-day). **Wire format is ISO `YYYY-MM-DD`** (DD-MM-YYYY is a frontend concern — the API never emits it). "Today" is computed in **Europe/Amsterdam** via `IClock`; no handler calls `DateTime.Now`.
- **Auth:** JWT bearer, roles in claims. Coarse-grained authorisation on the endpoint (`Admin` policy on `/api/admin/*` and `/api/employees`); fine-grained ownership/date/type rules in the handler via Domain invariants.
- **Errors (RFC 9457 ProblemDetails, one handler):**
  - **400** — shape/format validation (FluentValidation).
  - **401** — unauthenticated. **403** — authenticated but wrong role.
  - **404** — resource not found / not visible to the caller (used to hide other employees' leave from employees).
  - **422** — business-rule violation, with a stable machine-readable `code`.
- **Stable 422 codes (the FE↔BE contract — MUST NOT drift without a logged §9 decision):** `OVERLAP`, `TYPE_NOT_REGISTERABLE`, `START_DATE_IN_PAST`. This plan adds two **internal** codes that are not part of the FE contract and are noted where used: `END_BEFORE_START` (defence-in-depth; the validator returns 400 first) and `LEAVE_NOT_MODIFIABLE` (employee editing/deleting past-dated own leave).
- **Testing:** Domain invariants unit-tested exhaustively with **no DB**; endpoints integration-tested against **real PostgreSQL via Testcontainers**. Green pipeline before every merge; no skipped tests.
- **Git:** Branch off up-to-date `main` as `<type>/<kebab-summary>`; atomic Conventional Commits (`<type>(scope): imperative summary`); PR against `main` with a why-first body; `gh pr merge <n> --squash --delete-branch` with a clean squash message. Never commit to `main`.

### Demo assumptions (architecture open questions, resolved to documented defaults)

These are adopted so the plan is concrete. Each is the default the architecture already names; revisit if the team decides otherwise.

1. **Identity** = seeded local user store. `Employee` carries `Username` + `PasswordHash` (BCrypt). Sign-in validates username+password and issues a JWT. (No external IdP for the demo.)
2. **Leave types** = fixed seed data (AD-7). No admin CRUD slice for leave types in scope. Model leaves room for it to be additive later.
3. **Overlap** is forbidden regardless of leave type.
4. **Public holidays** are ordinary admin-created registrations per employee (no separate "applies to everyone" concept).

### Seed reference data (deterministic — fixed GUIDs so tests/E2E are stable)

**Leave types** (`Name`, `ColourHex`, `RegisterableBy`):
| Name | ColourHex | RegisterableBy |
| --- | --- | --- |
| Vacation | `#2E7D32` | Employee |
| Sick Leave | `#C62828` | Employee |
| Public Holiday | `#1565C0` | Admin |
| Other | `#6A1B9A` | Employee |

**Employees** (demo credentials):
| Name | Username | Role | Password |
| --- | --- | --- | --- |
| Alice Admin | `admin` | Admin | `Admin!123` |
| Eddie Employee | `employee` | Employee | `Employee!123` |
| Nora Newbie | `nora` | Employee | `Employee!123` |

---

## File Structure

Projects (created in PR 1). The scaffold's slice folders already exist as `.gitkeep` placeholders under `src/backend/LeaveCalendar.Web/Features/` — replace the `.gitkeep` with real files as each slice lands (`git rm` the placeholder in the same commit).

```
src/backend/
  LeaveCalendar.sln
  LeaveCalendar.Domain/                 (no framework refs)
    LeaveCalendar.Domain.csproj
    Employees/   Role.cs, Employee.cs
    LeaveTypes/  RegisterableBy.cs, LeaveType.cs
    Leave/       LeaveRegistration.cs, LeavePeriod.cs, LeaveRules.cs, LeaveErrorCodes.cs, DomainRuleException.cs
  LeaveCalendar.Web/
    LeaveCalendar.Web.csproj
    Common/        IEndpoint.cs, EndpointRegistration.cs, ValidationFilter.cs, DomainExceptionHandler.cs
    Infrastructure/
      Persistence/ LeaveDbContext.cs, DbSeeder.cs, Configurations/*.cs
      Time/        IClock.cs, SystemClock.cs
      Identity/    ICurrentUser.cs, CurrentUser.cs, IPasswordHasher.cs, BCryptPasswordHasher.cs
      Jwt/         JwtOptions.cs, IJwtTokenIssuer.cs, JwtTokenIssuer.cs
      DependencyInjection.cs
    Features/
      Auth/        SignIn/*, GetCurrentUser/*
      Reference/   ListLeaveTypes/*, ListEmployees/*
      Calendar/    ViewCalendar/*
      Leave/       ListMyLeave/*, RegisterMyLeave/*, EditMyLeave/*, DeleteMyLeave/*
      Admin/       ListAllLeave/*, AdminCreateLeave/*, AdminEditLeave/*, AdminDeleteLeave/*
    Migrations/    (EF generated)
    Program.cs
    appsettings.json, appsettings.Development.json
  LeaveCalendar.UnitTests/
    LeaveCalendar.UnitTests.csproj
    Leave/  LeavePeriodTests.cs, LeaveRulesTests.cs
    Time/   SystemClockTests.cs
    Fakes/  FakeClock.cs
  LeaveCalendar.IntegrationTests/
    LeaveCalendar.IntegrationTests.csproj
    Infrastructure/  ApiFactory.cs, IntegrationTestBase.cs, AuthExtensions.cs
    Features/        (one test class per slice)
```

Each slice folder follows the **slice anatomy**:
- `Endpoint.cs` — implements `IEndpoint`, maps one route, sets auth (`.RequireAuthorization()` / `.RequireAuthorization("Admin")`), attaches the `ValidationFilter<TRequest>` for write slices.
- `Request.cs` / `Response.cs` — slice-local records (omit `Request.cs` for GET/DELETE with no body).
- `Handler.cs` — orchestrates: load → apply Domain invariants → persist → map to `Response`.
- `Validator.cs` — FluentValidation `AbstractValidator<TRequest>` for write slices (shape → 400).

---

## PR Roadmap (each row = one branch → PR → squash-merge)

| PR | Branch | Delivers |
| --- | --- | --- |
| 1 | `feat/backend-domain-core` | Solution + 4 projects + Domain entities, `LeavePeriod`, `LeaveRules` + exhaustive unit tests |
| 2 | `feat/backend-web-host` | Web host boots: Common plumbing, EF `LeaveDbContext` + migration + seeder, `IClock`, ProblemDetails, Serilog, CORS, Swagger, `/health`; Testcontainers integration harness + smoke test |
| 3 | `feat/auth-jwt-and-signin` | JWT issuance/validation, password hashing, `Admin` policy, `ICurrentUser`, `SignIn` + `GetCurrentUser` slices + integration tests |
| 4 | `feat/reference-read-slices` | `ListLeaveTypes`, `ListEmployees` (admin) + integration tests |
| 5 | `feat/calendar-view` | `ViewCalendar` (window-intersection) + integration tests |
| 6 | `feat/my-leave-register` | `ListMyLeave` + `RegisterMyLeave` (the canonical write slice) + integration tests |
| 7 | `feat/my-leave-edit-delete` | `EditMyLeave`, `DeleteMyLeave` (own + future-dated) + integration tests |
| 8 | `feat/admin-leave-management` | `ListAllLeave` (paged/filtered), `AdminCreateLeave`, `AdminEditLeave`, `AdminDeleteLeave` + integration tests |

**Standard per-PR git ritual** (run at the start and end of every PR below; `<branch>` and messages per that PR):

```bash
# start
git checkout main && git pull --ff-only origin main
git checkout -b <branch>
# ... tasks/commits ...
# finish
git push -u origin <branch>
gh pr create --base main --title "<conventional title>" --body "<why-first body>"
gh pr view <n> --json mergeable,mergeStateStatus --jq '{mergeable,state:.mergeStateStatus}'   # expect MERGEABLE/CLEAN
gh pr merge <n> --squash --delete-branch                                                       # clean squash message
```

> Package versions: pin to the latest **10.x**-compatible release and **verify on NuGet before adding** (per the QA rule — do not assume "latest" works). Commands below use `dotnet add package` without a version; add `--version` once confirmed.

---

## PR 1 — Solution + Domain core  (`feat/backend-domain-core`)

**Outcome:** `dotnet build` and `dotnet test` are green; the entire domain rule set is verified with no database.

### Task 1.1: Create the solution and four projects (chore)

**Files:** `src/backend/LeaveCalendar.sln` + four `.csproj`.

- [ ] **Step 1: Create solution and projects**

```bash
cd src/backend
dotnet new sln -n LeaveCalendar
dotnet new classlib -n LeaveCalendar.Domain -o LeaveCalendar.Domain -f net10.0
dotnet new web      -n LeaveCalendar.Web    -o LeaveCalendar.Web    -f net10.0
dotnet new xunit    -n LeaveCalendar.UnitTests        -o LeaveCalendar.UnitTests        -f net10.0
dotnet new xunit    -n LeaveCalendar.IntegrationTests -o LeaveCalendar.IntegrationTests -f net10.0
# remove template default Class1.cs files
rm -f LeaveCalendar.Domain/Class1.cs
dotnet sln add LeaveCalendar.Domain LeaveCalendar.Web LeaveCalendar.UnitTests LeaveCalendar.IntegrationTests
```

- [ ] **Step 2: Wire project references**

```bash
dotnet add LeaveCalendar.Web reference LeaveCalendar.Domain
dotnet add LeaveCalendar.UnitTests reference LeaveCalendar.Domain LeaveCalendar.Web
dotnet add LeaveCalendar.IntegrationTests reference LeaveCalendar.Web
dotnet add LeaveCalendar.UnitTests package FluentAssertions
dotnet add LeaveCalendar.IntegrationTests package FluentAssertions
```

- [ ] **Step 3: Enable nullable + implicit usings in all four `.csproj`**

Ensure each `<PropertyGroup>` contains:

```xml
<TargetFramework>net10.0</TargetFramework>
<Nullable>enable</Nullable>
<ImplicitUsings>enable</ImplicitUsings>
```

- [ ] **Step 4: Build green**

Run: `dotnet build src/backend/LeaveCalendar.sln`
Expected: `Build succeeded`, 0 errors.

- [ ] **Step 5: Commit** (replace the Domain `.gitkeep`s as folders gain files in later tasks)

```bash
git add src/backend
git commit -m "chore(backend): scaffold .NET solution and four projects"
```

### Task 1.2: Domain enums and entities (feat)

**Files:** Create `LeaveCalendar.Domain/Employees/Role.cs`, `Employee.cs`; `LeaveTypes/RegisterableBy.cs`, `LeaveType.cs`; `Leave/LeaveRegistration.cs`. These are POCOs (no behaviour yet) — covered indirectly by later rule tests, so no dedicated test here.

**Interfaces produced (later tasks rely on these exact names/types):**
- `enum Role { Employee, Admin }`
- `enum RegisterableBy { Employee, Admin }`
- `Employee { Guid Id; string Name; string Username; string PasswordHash; Role Role }`
- `LeaveType { Guid Id; string Name; string ColourHex; RegisterableBy RegisterableBy }`
- `LeaveRegistration { Guid Id; Guid EmployeeId; Guid LeaveTypeId; DateOnly StartDate; DateOnly EndDate; string? Description; string? Notes }`

- [ ] **Step 1: Write the entities**

```csharp
// Employees/Role.cs
namespace LeaveCalendar.Domain.Employees;
public enum Role { Employee, Admin }

// Employees/Employee.cs
namespace LeaveCalendar.Domain.Employees;
public sealed class Employee
{
    public Guid Id { get; init; }
    public required string Name { get; set; }
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public Role Role { get; set; }
}

// LeaveTypes/RegisterableBy.cs
namespace LeaveCalendar.Domain.LeaveTypes;
public enum RegisterableBy { Employee, Admin }

// LeaveTypes/LeaveType.cs
namespace LeaveCalendar.Domain.LeaveTypes;
public sealed class LeaveType
{
    public Guid Id { get; init; }
    public required string Name { get; set; }
    public required string ColourHex { get; set; }
    public RegisterableBy RegisterableBy { get; set; }
}

// Leave/LeaveRegistration.cs
namespace LeaveCalendar.Domain.Leave;
public sealed class LeaveRegistration
{
    public Guid Id { get; init; }
    public Guid EmployeeId { get; init; }
    public Guid LeaveTypeId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? Description { get; set; } // <= 50 chars (enforced by validators/DB)
    public string? Notes { get; set; }       // <= 500 chars
}
```

- [ ] **Step 2: Build green** — `dotnet build src/backend/LeaveCalendar.sln` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/backend/LeaveCalendar.Domain
git commit -m "feat(domain): add Employee, LeaveType and LeaveRegistration entities"
```

### Task 1.3: `LeavePeriod` value object — overlap math (feat, TDD)

**Files:** Create `Leave/LeavePeriod.cs`; Test `LeaveCalendar.UnitTests/Leave/LeavePeriodTests.cs`.

**Interfaces produced:** `readonly record struct LeavePeriod(DateOnly Start, DateOnly End)` with `bool Overlaps(LeavePeriod other)` and `int DurationDays`.

- [ ] **Step 1: Write the failing tests** (overlap is inclusive; adjacency overlaps; 1-day works)

```csharp
// LeaveCalendar.UnitTests/Leave/LeavePeriodTests.cs
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using Xunit;

namespace LeaveCalendar.UnitTests.Leave;

public class LeavePeriodTests
{
    private static LeavePeriod P(int startDay, int endDay) =>
        new(new DateOnly(2026, 7, startDay), new DateOnly(2026, 7, endDay));

    [Fact] public void Identical_ranges_overlap() => P(10, 12).Overlaps(P(10, 12)).Should().BeTrue();
    [Fact] public void Contained_range_overlaps() => P(10, 20).Overlaps(P(12, 14)).Should().BeTrue();
    [Fact] public void Partial_overlap_is_true() => P(10, 15).Overlaps(P(14, 18)).Should().BeTrue();

    [Fact] // adjacency: End of A == Start of B is an OVERLAP (inclusive ranges)
    public void Adjacent_touching_ranges_overlap() => P(10, 12).Overlaps(P(12, 14)).Should().BeTrue();

    [Fact] public void Fully_separate_ranges_do_not_overlap() => P(10, 12).Overlaps(P(13, 15)).Should().BeFalse();
    [Fact] public void Overlap_is_symmetric() => P(14, 18).Overlaps(P(10, 15)).Should().BeTrue();

    [Fact] public void One_day_leave_overlaps_itself() => P(10, 10).Overlaps(P(10, 10)).Should().BeTrue();

    [Fact] public void Duration_of_one_day_leave_is_one() => P(10, 10).DurationDays.Should().Be(1);
    [Fact] public void Duration_is_inclusive() => P(10, 12).DurationDays.Should().Be(3);
}
```

- [ ] **Step 2: Run to verify it fails** — `dotnet test src/backend/LeaveCalendar.UnitTests` → FAIL (`LeavePeriod` does not exist).

- [ ] **Step 3: Implement**

```csharp
// LeaveCalendar.Domain/Leave/LeavePeriod.cs
namespace LeaveCalendar.Domain.Leave;

public readonly record struct LeavePeriod(DateOnly Start, DateOnly End)
{
    // Inclusive ranges: a touches b when a.Start <= b.End AND b.Start <= a.End.
    public bool Overlaps(LeavePeriod other) => Start <= other.End && other.Start <= End;

    public int DurationDays => End.DayNumber - Start.DayNumber + 1;
}
```

- [ ] **Step 4: Run to verify it passes** — `dotnet test src/backend/LeaveCalendar.UnitTests` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backend/LeaveCalendar.Domain/Leave/LeavePeriod.cs src/backend/LeaveCalendar.UnitTests/Leave/LeavePeriodTests.cs
git commit -m "feat(domain): add LeavePeriod with inclusive overlap and duration"
```

### Task 1.4: Error codes + `DomainRuleException` (feat)

**Files:** Create `Leave/LeaveErrorCodes.cs`, `Leave/DomainRuleException.cs`.

**Interfaces produced:** `LeaveErrorCodes` constants; `sealed class DomainRuleException : Exception { string Code }`.

- [ ] **Step 1: Implement**

```csharp
// LeaveCalendar.Domain/Leave/LeaveErrorCodes.cs
namespace LeaveCalendar.Domain.Leave;

public static class LeaveErrorCodes
{
    public const string Overlap = "OVERLAP";                       // FE contract
    public const string TypeNotRegisterable = "TYPE_NOT_REGISTERABLE"; // FE contract
    public const string StartDateInPast = "START_DATE_IN_PAST";    // FE contract
    public const string EndBeforeStart = "END_BEFORE_START";       // internal (validator returns 400 first)
    public const string LeaveNotModifiable = "LEAVE_NOT_MODIFIABLE"; // internal: past-dated own leave edit/delete
}

// LeaveCalendar.Domain/Leave/DomainRuleException.cs
namespace LeaveCalendar.Domain.Leave;

public sealed class DomainRuleException(string code, string? message = null)
    : Exception(message ?? code)
{
    public string Code { get; } = code;
}
```

- [ ] **Step 2: Build green** — `dotnet build src/backend/LeaveCalendar.sln`.

- [ ] **Step 3: Commit**

```bash
git add src/backend/LeaveCalendar.Domain/Leave/LeaveErrorCodes.cs src/backend/LeaveCalendar.Domain/Leave/DomainRuleException.cs
git commit -m "feat(domain): add stable leave error codes and DomainRuleException"
```

### Task 1.5: `LeaveRules` invariants (feat, TDD)

**Files:** Create `Leave/LeaveRules.cs`; Test `LeaveCalendar.UnitTests/Leave/LeaveRulesTests.cs`.

**Interfaces produced (called by all four write slices):**
- `LeaveRules.EnsureEndOnOrAfterStart(DateOnly start, DateOnly end)`
- `LeaveRules.EnsureStartTodayOrFuture(DateOnly start, DateOnly today)`
- `LeaveRules.EnsureTypeRegisterableBy(LeaveType type, Role role)`
- `LeaveRules.EnsureNoOverlap(LeavePeriod candidate, IEnumerable<LeaveRegistration> existing, Guid? excludingId = null)`
- `LeaveRules.EnsureEditableByEmployee(LeaveRegistration reg, DateOnly today)`

- [ ] **Step 1: Write the failing tests** (exhaustive — this is the highest-value target)

```csharp
// LeaveCalendar.UnitTests/Leave/LeaveRulesTests.cs
using FluentAssertions;
using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Domain.LeaveTypes;
using Xunit;

namespace LeaveCalendar.UnitTests.Leave;

public class LeaveRulesTests
{
    private static DateOnly D(int day) => new(2026, 7, day);
    private static LeaveRegistration Reg(Guid id, int start, int end) =>
        new() { Id = id, EmployeeId = Guid.NewGuid(), LeaveTypeId = Guid.NewGuid(), StartDate = D(start), EndDate = D(end) };

    // --- EnsureEndOnOrAfterStart (rule 2) ---
    [Fact] public void End_after_start_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEndOnOrAfterStart(D(10), D(12))).Should().NotThrow();
    [Fact] public void Same_day_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEndOnOrAfterStart(D(10), D(10))).Should().NotThrow();
    [Fact] public void End_before_start_throws_END_BEFORE_START() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEndOnOrAfterStart(D(12), D(10)))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.EndBeforeStart);

    // --- EnsureStartTodayOrFuture (rule 4) ---
    [Fact] public void Start_today_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureStartTodayOrFuture(D(10), today: D(10))).Should().NotThrow();
    [Fact] public void Start_future_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureStartTodayOrFuture(D(11), today: D(10))).Should().NotThrow();
    [Fact] public void Start_in_past_throws_START_DATE_IN_PAST() =>
        FluentActions.Invoking(() => LeaveRules.EnsureStartTodayOrFuture(D(9), today: D(10)))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.StartDateInPast);

    // --- EnsureTypeRegisterableBy (rule 3) ---
    private static LeaveType Type(RegisterableBy by) => new() { Id = Guid.NewGuid(), Name = "X", ColourHex = "#000000", RegisterableBy = by };

    [Fact] public void Employee_can_register_employee_type() =>
        FluentActions.Invoking(() => LeaveRules.EnsureTypeRegisterableBy(Type(RegisterableBy.Employee), Role.Employee)).Should().NotThrow();
    [Fact] public void Employee_cannot_register_admin_type() =>
        FluentActions.Invoking(() => LeaveRules.EnsureTypeRegisterableBy(Type(RegisterableBy.Admin), Role.Employee))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.TypeNotRegisterable);
    [Fact] public void Admin_can_register_any_type() =>
        FluentActions.Invoking(() => LeaveRules.EnsureTypeRegisterableBy(Type(RegisterableBy.Admin), Role.Admin)).Should().NotThrow();

    // --- EnsureNoOverlap (rule 1) ---
    [Fact] public void No_overlap_with_separate_existing_passes()
    {
        var existing = new[] { Reg(Guid.NewGuid(), 1, 3) };
        FluentActions.Invoking(() => LeaveRules.EnsureNoOverlap(new LeavePeriod(D(10), D(12)), existing)).Should().NotThrow();
    }
    [Fact] public void Overlap_throws_OVERLAP()
    {
        var existing = new[] { Reg(Guid.NewGuid(), 11, 13) };
        FluentActions.Invoking(() => LeaveRules.EnsureNoOverlap(new LeavePeriod(D(10), D(12)), existing))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.Overlap);
    }
    [Fact] public void Adjacency_is_treated_as_overlap()
    {
        var existing = new[] { Reg(Guid.NewGuid(), 12, 14) };
        FluentActions.Invoking(() => LeaveRules.EnsureNoOverlap(new LeavePeriod(D(10), D(12)), existing))
            .Should().Throw<DomainRuleException>();
    }
    [Fact] public void Excluded_self_does_not_count_as_overlap()
    {
        var self = Reg(Guid.NewGuid(), 10, 12);
        FluentActions.Invoking(() => LeaveRules.EnsureNoOverlap(new LeavePeriod(D(10), D(12)), new[] { self }, excludingId: self.Id)).Should().NotThrow();
    }

    // --- EnsureEditableByEmployee (rule 3: only future-dated own leave) ---
    [Fact] public void Editing_future_dated_leave_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEditableByEmployee(Reg(Guid.NewGuid(), 11, 12), today: D(10))).Should().NotThrow();
    [Fact] public void Editing_today_dated_leave_passes() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEditableByEmployee(Reg(Guid.NewGuid(), 10, 12), today: D(10))).Should().NotThrow();
    [Fact] public void Editing_past_dated_leave_throws_LEAVE_NOT_MODIFIABLE() =>
        FluentActions.Invoking(() => LeaveRules.EnsureEditableByEmployee(Reg(Guid.NewGuid(), 9, 12), today: D(10)))
            .Should().Throw<DomainRuleException>().Which.Code.Should().Be(LeaveErrorCodes.LeaveNotModifiable);
}
```

- [ ] **Step 2: Run to verify it fails** — `dotnet test src/backend/LeaveCalendar.UnitTests` → FAIL (`LeaveRules` not defined).

- [ ] **Step 3: Implement**

```csharp
// LeaveCalendar.Domain/Leave/LeaveRules.cs
using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Domain.LeaveTypes;

namespace LeaveCalendar.Domain.Leave;

public static class LeaveRules
{
    public static void EnsureEndOnOrAfterStart(DateOnly start, DateOnly end)
    {
        if (end < start) throw new DomainRuleException(LeaveErrorCodes.EndBeforeStart);
    }

    public static void EnsureStartTodayOrFuture(DateOnly start, DateOnly today)
    {
        if (start < today) throw new DomainRuleException(LeaveErrorCodes.StartDateInPast);
    }

    public static void EnsureTypeRegisterableBy(LeaveType type, Role role)
    {
        if (role == Role.Admin) return; // admin may register any type
        if (type.RegisterableBy != RegisterableBy.Employee)
            throw new DomainRuleException(LeaveErrorCodes.TypeNotRegisterable);
    }

    public static void EnsureNoOverlap(LeavePeriod candidate, IEnumerable<LeaveRegistration> existing, Guid? excludingId = null)
    {
        foreach (var reg in existing)
        {
            if (excludingId is { } id && reg.Id == id) continue;
            if (candidate.Overlaps(new LeavePeriod(reg.StartDate, reg.EndDate)))
                throw new DomainRuleException(LeaveErrorCodes.Overlap);
        }
    }

    public static void EnsureEditableByEmployee(LeaveRegistration reg, DateOnly today)
    {
        if (reg.StartDate < today) throw new DomainRuleException(LeaveErrorCodes.LeaveNotModifiable);
    }
}
```

- [ ] **Step 4: Run to verify it passes** — `dotnet test src/backend/LeaveCalendar.UnitTests` → PASS (all rule tests green).

- [ ] **Step 5: Commit**

```bash
git add src/backend/LeaveCalendar.Domain/Leave/LeaveRules.cs src/backend/LeaveCalendar.UnitTests/Leave/LeaveRulesTests.cs
git commit -m "feat(domain): implement LeaveRules invariants with exhaustive unit tests"
```

### PR 1 finish

- [ ] Run full suite: `dotnet test src/backend/LeaveCalendar.sln` → all green.
- [ ] Push, open PR, squash-merge:

```bash
git push -u origin feat/backend-domain-core
gh pr create --base main --title "feat(domain): leave calendar domain core and invariants" \
  --body "Adds the framework-free domain: Employee/LeaveType/LeaveRegistration entities, the LeavePeriod value object, and LeaveRules (overlap, end>=start, type eligibility, start>=today, editable-by-employee) with exhaustive unit tests. This is the single home for the rules shared by all four write slices (AD-8). No DB, no framework deps."
gh pr merge <n> --squash --delete-branch
```

---

## PR 2 — Web host + infrastructure  (`feat/backend-web-host`)

**Outcome:** `dotnet run` boots the API against PostgreSQL, applies migrations + seed, serves `/health` and `/swagger`; the Testcontainers integration harness runs a green `/health` smoke test.

### Task 2.1: Add Web + IntegrationTests packages (chore)

- [ ] **Step 1: Add packages** (pin versions after verifying on NuGet)

```bash
cd src/backend
dotnet add LeaveCalendar.Web package Microsoft.EntityFrameworkCore.Design
dotnet add LeaveCalendar.Web package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add LeaveCalendar.Web package FluentValidation.DependencyInjectionExtensions
dotnet add LeaveCalendar.Web package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add LeaveCalendar.Web package BCrypt.Net-Next
dotnet add LeaveCalendar.Web package Serilog.AspNetCore
dotnet add LeaveCalendar.Web package Swashbuckle.AspNetCore
dotnet add LeaveCalendar.IntegrationTests package Microsoft.AspNetCore.Mvc.Testing
dotnet add LeaveCalendar.IntegrationTests package Testcontainers.PostgreSql
```

- [ ] **Step 2: Build green** then **Commit**

```bash
git add src/backend
git commit -m "chore(web): add EF Core, JWT, validation, Serilog and test packages"
```

### Task 2.2: Common plumbing — `IEndpoint`, registration, validation filter, exception handler (feat)

**Files:** Create `Common/IEndpoint.cs`, `Common/EndpointRegistration.cs`, `Common/ValidationFilter.cs`, `Common/DomainExceptionHandler.cs`.

**Interfaces produced:**
- `interface IEndpoint { void Map(IEndpointRouteBuilder app); }`
- `IServiceCollection.AddEndpoints(Assembly)`, `WebApplication.MapEndpoints()`
- `ValidationFilter<TRequest> : IEndpointFilter`
- `DomainExceptionHandler : IExceptionHandler`

- [ ] **Step 1: Implement**

```csharp
// Common/IEndpoint.cs
namespace LeaveCalendar.Web.Common;
public interface IEndpoint { void Map(IEndpointRouteBuilder app); }

// Common/EndpointRegistration.cs
using System.Reflection;
namespace LeaveCalendar.Web.Common;
public static class EndpointRegistration
{
    public static IServiceCollection AddEndpoints(this IServiceCollection services, Assembly assembly)
    {
        foreach (var type in assembly.GetTypes()
                     .Where(t => t is { IsAbstract: false, IsInterface: false } && typeof(IEndpoint).IsAssignableFrom(t)))
            services.AddSingleton(typeof(IEndpoint), type);
        return services;
    }

    public static IApplicationBuilder MapEndpoints(this WebApplication app)
    {
        foreach (var endpoint in app.Services.GetRequiredService<IEnumerable<IEndpoint>>())
            endpoint.Map(app);
        return app;
    }
}

// Common/ValidationFilter.cs
using FluentValidation;
namespace LeaveCalendar.Web.Common;
public sealed class ValidationFilter<TRequest>(IValidator<TRequest> validator) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var request = context.Arguments.OfType<TRequest>().FirstOrDefault();
        if (request is not null)
        {
            var result = await validator.ValidateAsync(request);
            if (!result.IsValid) throw new ValidationException(result.Errors); // -> 400 via DomainExceptionHandler
        }
        return await next(context);
    }
}

// Common/DomainExceptionHandler.cs
using FluentValidation;
using LeaveCalendar.Domain.Leave;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
namespace LeaveCalendar.Web.Common;
public sealed class DomainExceptionHandler(IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        ProblemDetails problem;
        switch (exception)
        {
            case ValidationException ve:
                problem = new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Validation failed",
                    Type = "https://datatracker.ietf.org/doc/html/rfc9457"
                };
                problem.Extensions["errors"] = ve.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
                break;
            case DomainRuleException de:
                problem = new ProblemDetails
                {
                    Status = StatusCodes.Status422UnprocessableEntity,
                    Title = "Business rule violation",
                    Type = "https://datatracker.ietf.org/doc/html/rfc9457"
                };
                problem.Extensions["code"] = de.Code;
                break;
            default:
                return false; // let the framework produce a 500
        }
        httpContext.Response.StatusCode = problem.Status!.Value;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem
        });
    }
}
```

- [ ] **Step 2: Build green** then **Commit**

```bash
git add src/backend/LeaveCalendar.Web/Common
git commit -m "feat(web): add endpoint auto-registration, validation filter and ProblemDetails handler"
```

### Task 2.3: Clock (feat, TDD)

**Files:** Create `Infrastructure/Time/IClock.cs`, `SystemClock.cs`; Test `LeaveCalendar.UnitTests/Time/SystemClockTests.cs`, and `Fakes/FakeClock.cs`.

**Interfaces produced:** `interface IClock { DateOnly Today { get; } DateTimeOffset Now { get; } }`, plus a `FakeClock` for tests.

- [ ] **Step 1: Write the failing test + fake**

```csharp
// LeaveCalendar.UnitTests/Fakes/FakeClock.cs
using LeaveCalendar.Web.Infrastructure.Time;
namespace LeaveCalendar.UnitTests.Fakes;
public sealed class FakeClock(DateOnly today) : IClock
{
    public DateOnly Today { get; } = today;
    public DateTimeOffset Now { get; } = new(today.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
}

// LeaveCalendar.UnitTests/Time/SystemClockTests.cs
using FluentAssertions;
using LeaveCalendar.Web.Infrastructure.Time;
using Xunit;
namespace LeaveCalendar.UnitTests.Time;
public class SystemClockTests
{
    [Fact]
    public void Today_matches_Now_date_in_Amsterdam()
    {
        var clock = new SystemClock();
        clock.Today.Should().Be(DateOnly.FromDateTime(clock.Now.DateTime));
    }
}
```

- [ ] **Step 2: Run to verify it fails** — `dotnet test src/backend/LeaveCalendar.UnitTests` → FAIL (`IClock`/`SystemClock` missing).

- [ ] **Step 3: Implement**

```csharp
// Infrastructure/Time/IClock.cs
namespace LeaveCalendar.Web.Infrastructure.Time;
public interface IClock { DateOnly Today { get; } DateTimeOffset Now { get; } }

// Infrastructure/Time/SystemClock.cs
namespace LeaveCalendar.Web.Infrastructure.Time;
public sealed class SystemClock : IClock
{
    private static readonly TimeZoneInfo Amsterdam = TimeZoneInfo.FindSystemTimeZoneById("Europe/Amsterdam");
    public DateTimeOffset Now => TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, Amsterdam);
    public DateOnly Today => DateOnly.FromDateTime(Now.DateTime);
}
```

- [ ] **Step 4: Run to verify it passes** then **Commit**

```bash
git add src/backend/LeaveCalendar.Web/Infrastructure/Time src/backend/LeaveCalendar.UnitTests/Time src/backend/LeaveCalendar.UnitTests/Fakes
git commit -m "feat(web): add Europe/Amsterdam IClock with SystemClock"
```

### Task 2.4: `LeaveDbContext`, EF configurations, indexes (feat)

**Files:** Create `Infrastructure/Persistence/LeaveDbContext.cs` and `Configurations/{EmployeeConfiguration,LeaveTypeConfiguration,LeaveRegistrationConfiguration}.cs`.

**Interfaces produced:** `LeaveDbContext { DbSet<Employee> Employees; DbSet<LeaveType> LeaveTypes; DbSet<LeaveRegistration> LeaveRegistrations }`.

Key persistence rules (from backend §9): unique index on `LeaveType.Name` and `LeaveType.ColourHex`; unique index on `Employee.Username`; composite index on `LeaveRegistration(EmployeeId, StartDate, EndDate)`; enums stored as strings; `Description` max 50, `Notes` max 500.

- [ ] **Step 1: Implement DbContext + configurations**

```csharp
// Infrastructure/Persistence/LeaveDbContext.cs
using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Domain.LeaveTypes;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Infrastructure.Persistence;
public sealed class LeaveDbContext(DbContextOptions<LeaveDbContext> options) : DbContext(options)
{
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
    public DbSet<LeaveRegistration> LeaveRegistrations => Set<LeaveRegistration>();
    protected override void OnModelCreating(ModelBuilder b) => b.ApplyConfigurationsFromAssembly(typeof(LeaveDbContext).Assembly);
}

// Infrastructure/Persistence/Configurations/EmployeeConfiguration.cs
using LeaveCalendar.Domain.Employees;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
namespace LeaveCalendar.Web.Infrastructure.Persistence.Configurations;
public sealed class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> e)
    {
        e.ToTable("employees");
        e.HasKey(x => x.Id);
        e.Property(x => x.Name).IsRequired().HasMaxLength(200);
        e.Property(x => x.Username).IsRequired().HasMaxLength(100);
        e.Property(x => x.PasswordHash).IsRequired();
        e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
        e.HasIndex(x => x.Username).IsUnique();
    }
}

// Infrastructure/Persistence/Configurations/LeaveTypeConfiguration.cs
using LeaveCalendar.Domain.LeaveTypes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
namespace LeaveCalendar.Web.Infrastructure.Persistence.Configurations;
public sealed class LeaveTypeConfiguration : IEntityTypeConfiguration<LeaveType>
{
    public void Configure(EntityTypeBuilder<LeaveType> t)
    {
        t.ToTable("leave_types");
        t.HasKey(x => x.Id);
        t.Property(x => x.Name).IsRequired().HasMaxLength(100);
        t.Property(x => x.ColourHex).IsRequired().HasMaxLength(7);
        t.Property(x => x.RegisterableBy).HasConversion<string>().HasMaxLength(20);
        t.HasIndex(x => x.Name).IsUnique();
        t.HasIndex(x => x.ColourHex).IsUnique();
    }
}

// Infrastructure/Persistence/Configurations/LeaveRegistrationConfiguration.cs
using LeaveCalendar.Domain.Leave;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
namespace LeaveCalendar.Web.Infrastructure.Persistence.Configurations;
public sealed class LeaveRegistrationConfiguration : IEntityTypeConfiguration<LeaveRegistration>
{
    public void Configure(EntityTypeBuilder<LeaveRegistration> r)
    {
        r.ToTable("leave_registrations");
        r.HasKey(x => x.Id);
        r.Property(x => x.StartDate).IsRequired();
        r.Property(x => x.EndDate).IsRequired();
        r.Property(x => x.Description).HasMaxLength(50);
        r.Property(x => x.Notes).HasMaxLength(500);
        r.HasIndex(x => new { x.EmployeeId, x.StartDate, x.EndDate });
        r.HasOne<Domain.Employees.Employee>().WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Cascade);
        r.HasOne<Domain.LeaveTypes.LeaveType>().WithMany().HasForeignKey(x => x.LeaveTypeId).OnDelete(DeleteBehavior.Restrict);
    }
}
```

- [ ] **Step 2: Build green** then **Commit**

```bash
git add src/backend/LeaveCalendar.Web/Infrastructure/Persistence
git commit -m "feat(web): add LeaveDbContext with EF configurations, indexes and constraints"
```

### Task 2.5: Password hasher + seeder (feat)

**Files:** Create `Infrastructure/Identity/IPasswordHasher.cs`, `BCryptPasswordHasher.cs`; `Infrastructure/Persistence/DbSeeder.cs`.

**Interfaces produced:** `IPasswordHasher { string Hash(string); bool Verify(string password, string hash); }`; `DbSeeder.SeedAsync(LeaveDbContext, IPasswordHasher, CancellationToken)` idempotent — inserts the seed reference data only when tables are empty, using the fixed GUIDs/colours/credentials from **Global Constraints**.

- [ ] **Step 1: Implement hasher + seeder**

```csharp
// Infrastructure/Identity/IPasswordHasher.cs
namespace LeaveCalendar.Web.Infrastructure.Identity;
public interface IPasswordHasher { string Hash(string password); bool Verify(string password, string hash); }

// Infrastructure/Identity/BCryptPasswordHasher.cs
namespace LeaveCalendar.Web.Infrastructure.Identity;
public sealed class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);
    public bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}

// Infrastructure/Persistence/DbSeeder.cs
using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Domain.LeaveTypes;
using LeaveCalendar.Web.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Infrastructure.Persistence;
public static class DbSeeder
{
    public static async Task SeedAsync(LeaveDbContext db, IPasswordHasher hasher, CancellationToken ct = default)
    {
        if (!await db.LeaveTypes.AnyAsync(ct))
        {
            db.LeaveTypes.AddRange(
                new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000001"), Name = "Vacation",       ColourHex = "#2E7D32", RegisterableBy = RegisterableBy.Employee },
                new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000002"), Name = "Sick Leave",     ColourHex = "#C62828", RegisterableBy = RegisterableBy.Employee },
                new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000003"), Name = "Public Holiday", ColourHex = "#1565C0", RegisterableBy = RegisterableBy.Admin },
                new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000004"), Name = "Other",          ColourHex = "#6A1B9A", RegisterableBy = RegisterableBy.Employee });
        }
        if (!await db.Employees.AnyAsync(ct))
        {
            db.Employees.AddRange(
                new Employee { Id = Guid.Parse("22222222-0000-0000-0000-000000000001"), Name = "Alice Admin",   Username = "admin",    Role = Role.Admin,    PasswordHash = hasher.Hash("Admin!123") },
                new Employee { Id = Guid.Parse("22222222-0000-0000-0000-000000000002"), Name = "Eddie Employee", Username = "employee", Role = Role.Employee, PasswordHash = hasher.Hash("Employee!123") },
                new Employee { Id = Guid.Parse("22222222-0000-0000-0000-000000000003"), Name = "Nora Newbie",    Username = "nora",     Role = Role.Employee, PasswordHash = hasher.Hash("Employee!123") });
        }
        await db.SaveChangesAsync(ct);
    }
}
```

- [ ] **Step 2: Build green** then **Commit**

```bash
git add src/backend/LeaveCalendar.Web/Infrastructure/Identity src/backend/LeaveCalendar.Web/Infrastructure/Persistence/DbSeeder.cs
git commit -m "feat(web): add BCrypt password hasher and deterministic reference-data seeder"
```

### Task 2.6: `Program.cs` wiring + DI + health + Swagger + Serilog + CORS (feat)

**Files:** Create `Infrastructure/DependencyInjection.cs`; write `Program.cs`; add `appsettings.json` / `appsettings.Development.json`. Delete the template's default endpoint.

**Interfaces produced:** `public partial class Program` (so `WebApplicationFactory<Program>` can reference it). DI extension `AddLeaveCalendar(this WebApplicationBuilder)`.

- [ ] **Step 1: Implement DI extension**

```csharp
// Infrastructure/DependencyInjection.cs
using FluentValidation;
using LeaveCalendar.Web.Common;
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using LeaveCalendar.Web.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Infrastructure;
public static class DependencyInjection
{
    public static WebApplicationBuilder AddLeaveCalendar(this WebApplicationBuilder builder)
    {
        var services = builder.Services;
        services.AddDbContext<LeaveDbContext>(o =>
            o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddHttpContextAccessor();
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddEndpoints(typeof(DependencyInjection).Assembly);
        services.AddProblemDetails();
        services.AddExceptionHandler<DomainExceptionHandler>();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        services.AddCors(o => o.AddPolicy("Spa", p => p
            .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
            .AllowAnyHeader().AllowAnyMethod()));
        return builder;
    }
}
```

- [ ] **Step 2: Implement `Program.cs`** (JWT auth/authz added in PR 3 — marked there)

```csharp
// Program.cs
using LeaveCalendar.Web.Common;
using LeaveCalendar.Web.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration).Enrich.FromLogContext());
builder.AddLeaveCalendar();

var app = builder.Build();

app.UseExceptionHandler();
app.UseSerilogRequestLogging();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("Spa");
// app.UseAuthentication(); app.UseAuthorization();  // <-- enabled in PR 3
app.MapGet("/health", () => Results.Ok(new { status = "healthy" })).AllowAnonymous();
app.MapEndpoints();

// migrate + seed on startup (skipped under the integration-test environment, which does it in the harness)
if (!app.Environment.IsEnvironment("IntegrationTest"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher>());
}

app.Run();

public partial class Program; // exposed for WebApplicationFactory<Program>
```

- [ ] **Step 3: Configuration files**

`appsettings.json` — Serilog block, empty `ConnectionStrings:Default`, `Cors:Origins: ["http://localhost:5173"]`, and a `Jwt` block placeholder (filled in PR 3). `appsettings.Development.json` — local Postgres connection string, e.g. `Host=localhost;Port=5432;Database=leavecalendar;Username=postgres;Password=postgres`. **Secrets (JWT signing key) come from user-secrets, never source.**

- [ ] **Step 4: Build green** — `dotnet build src/backend/LeaveCalendar.sln`.

- [ ] **Step 5: Commit**

```bash
git add src/backend/LeaveCalendar.Web/Program.cs src/backend/LeaveCalendar.Web/Infrastructure/DependencyInjection.cs src/backend/LeaveCalendar.Web/appsettings*.json
git commit -m "feat(web): wire host with EF, ProblemDetails, Serilog, CORS, Swagger and health"
```

### Task 2.7: Initial EF migration (feat)

- [ ] **Step 1: Generate migration** (requires `dotnet-ef`; `dotnet tool install --global dotnet-ef` if missing)

```bash
cd src/backend
dotnet ef migrations add InitialCreate --project LeaveCalendar.Web --startup-project LeaveCalendar.Web -o Migrations
```

- [ ] **Step 2: Verify it builds** — `dotnet build src/backend/LeaveCalendar.sln`.

- [ ] **Step 3: Commit**

```bash
git add src/backend/LeaveCalendar.Web/Migrations
git commit -m "feat(web): add initial EF Core migration"
```

### Task 2.8: Integration-test harness + `/health` smoke test (test, TDD)

**Files:** Create `LeaveCalendar.IntegrationTests/Infrastructure/ApiFactory.cs`, `IntegrationTestBase.cs`; Test `Features/HealthTests.cs`.

**Interfaces produced (every later integration test relies on these):**
- `ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime` — starts a Testcontainers `PostgreSqlContainer`, overrides `ConnectionStrings:Default`, sets environment `IntegrationTest`, runs `MigrateAsync` + `DbSeeder.SeedAsync` once on init, and exposes `ResetAsync()` to truncate `leave_registrations` between tests.
- `[Collection("api")]` `IntegrationTestBase` exposing `HttpClient Client` and the seeded IDs.

- [ ] **Step 1: Write the harness**

```csharp
// Infrastructure/ApiFactory.cs
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Testcontainers.PostgreSql;
using Xunit;
namespace LeaveCalendar.IntegrationTests.Infrastructure;

public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder().WithImage("postgres:16-alpine").Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("IntegrationTest");
        builder.ConfigureAppConfiguration((_, cfg) => cfg.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = _db.GetConnectionString(),
            ["Jwt:Issuer"] = "leave-calendar-tests",
            ["Jwt:Audience"] = "leave-calendar-tests",
            ["Jwt:SigningKey"] = "test-signing-key-at-least-32-bytes-long!!"
        }));
    }

    public async Task InitializeAsync()
    {
        await _db.StartAsync();
        using var scope = Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        await ctx.Database.MigrateAsync();
        await DbSeeder.SeedAsync(ctx, scope.ServiceProvider.GetRequiredService<IPasswordHasher>());
    }

    public async Task ResetAsync()
    {
        using var scope = Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        await ctx.Database.ExecuteSqlRawAsync("TRUNCATE TABLE leave_registrations RESTART IDENTITY CASCADE;");
    }

    public new async Task DisposeAsync() => await _db.DisposeAsync();
}

// Infrastructure/IntegrationTestBase.cs
using Xunit;
namespace LeaveCalendar.IntegrationTests.Infrastructure;
[CollectionDefinition("api")]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>;

[Collection("api")]
public abstract class IntegrationTestBase(ApiFactory factory)
{
    protected ApiFactory Factory { get; } = factory;
    protected HttpClient Client { get; } = factory.CreateClient();
}
```

- [ ] **Step 2: Write the smoke test**

```csharp
// Features/HealthTests.cs
using System.Net;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;
using Xunit;
namespace LeaveCalendar.IntegrationTests.Features;
public class HealthTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task Health_returns_200()
    {
        var response = await Client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
```

- [ ] **Step 3: Run** (Docker must be running) — `dotnet test src/backend/LeaveCalendar.IntegrationTests` → PASS (container spins up, `/health` is 200).

- [ ] **Step 4: Commit**

```bash
git add src/backend/LeaveCalendar.IntegrationTests
git commit -m "test(web): add Testcontainers integration harness and health smoke test"
```

### PR 2 finish

- [ ] `dotnet test src/backend/LeaveCalendar.sln` → all green (Docker running).
- [ ] Push, PR, squash-merge:

```bash
git push -u origin feat/backend-web-host
gh pr create --base main --title "feat(web): bootstrap API host, persistence and integration harness" \
  --body "Boots the Leave Calendar API: endpoint auto-registration, ProblemDetails error handling, EF Core LeaveDbContext with indexes/constraints, Europe/Amsterdam IClock, deterministic seeder, Serilog, CORS, Swagger and /health. Adds the Testcontainers integration-test harness with a green health smoke test. No business slices yet — those land per-PR next."
gh pr merge <n> --squash --delete-branch
```

---

## PR 3 — Authentication  (`feat/auth-jwt-and-signin`)

**Outcome:** Users sign in (username+password) and receive a JWT carrying `sub` (employee id), `name`, and `role`; `GET /api/auth/me` returns the current user; protected endpoints reject anonymous callers with 401; the `Admin` policy is registered.

### Task 3.1: JWT options + token issuer (feat)

**Files:** Create `Infrastructure/Jwt/JwtOptions.cs`, `IJwtTokenIssuer.cs`, `JwtTokenIssuer.cs`.

**Interfaces produced:**
- `JwtOptions { string Issuer; string Audience; string SigningKey; int ExpiryMinutes = 480 }`
- `IJwtTokenIssuer { string Issue(Employee employee); }` — emits HS256 token with claims `sub`=Id, `name`=Name, `role`=Role, `unique_name`=Username.

- [ ] **Step 1: Implement** (standard `JwtSecurityTokenHandler` / `SymmetricSecurityKey`, `ClaimTypes.Role` mapped to the `role` claim, expiry from options). Register `JwtOptions` via `builder.Configuration.GetSection("Jwt")` and `IJwtTokenIssuer` as singleton in `DependencyInjection.AddLeaveCalendar`.

- [ ] **Step 2: Build green** then **Commit** — `feat(auth): add JWT options and HS256 token issuer`.

### Task 3.2: Authentication + authorisation pipeline + `ICurrentUser` (feat)

**Files:** Create `Infrastructure/Identity/ICurrentUser.cs`, `CurrentUser.cs`. Modify `DependencyInjection.cs` (add `AddAuthentication().AddJwtBearer(...)` validating issuer/audience/key/lifetime, and `AddAuthorizationBuilder().AddPolicy("Admin", p => p.RequireRole("Admin"))`; register `ICurrentUser`). Modify `Program.cs` to **uncomment** `app.UseAuthentication(); app.UseAuthorization();` (place after `UseCors`).

**Interfaces produced:** `ICurrentUser { Guid EmployeeId; Role Role; bool IsAdmin; string Name; }` reading from `IHttpContextAccessor.HttpContext.User` claims.

- [ ] **Step 1: Implement `ICurrentUser`/`CurrentUser`**, JWT bearer + policy registration, and pipeline enablement.
- [ ] **Step 2: Build green** then **Commit** — `feat(auth): add JWT bearer auth, Admin policy and ICurrentUser`.

### Task 3.3: `SignIn` slice (feat, TDD via integration)

**Files:** Create `Features/Auth/SignIn/{Endpoint,Request,Response,Handler,Validator}.cs`; `git rm` `Features/Auth/SignIn/.gitkeep`. Test `IntegrationTests/Features/SignInTests.cs`.

**Contract:**
- Route: `POST /api/auth/sign-in`, **Anonymous**.
- `Request(string Username, string Password)`. `Validator`: both required/non-empty (→ 400).
- `Handler`: load employee by `Username`; if missing **or** `IPasswordHasher.Verify` fails → **401** (do not reveal which); else issue JWT.
- `Response(string Token, string Name, string Role)`.

- [ ] **Step 1: Write failing integration tests**
  - happy path: `admin`/`Admin!123` → 200, non-empty token, role `Admin`.
  - wrong password → 401.
  - unknown username → 401.
  - missing field → 400.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement the slice** (endpoint maps route + `ValidationFilter<Request>` + `.AllowAnonymous()`; handler as specified).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `feat(auth): add SignIn slice issuing JWT on valid credentials`.

### Task 3.4: `GetCurrentUser` slice + auth helper (feat, TDD via integration)

**Files:** Create `Features/Auth/GetCurrentUser/{Endpoint,Response,Handler}.cs`; `git rm` placeholder. Create `IntegrationTests/Infrastructure/AuthExtensions.cs` (helper: `Task<HttpClient> AuthenticatedClientAsync(this ApiFactory, string username, string password)` that calls sign-in and sets the bearer header — used by all later authenticated tests). Test `IntegrationTests/Features/GetCurrentUserTests.cs`.

**Contract:**
- Route: `GET /api/auth/me`, **Authenticated**.
- `Response(Guid Id, string Name, string Role)` from `ICurrentUser` (look up name/role from claims or DB).

- [ ] **Step 1: Write failing tests** — authenticated employee → 200 with their name/role; no token → 401.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** slice + `AuthExtensions`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `feat(auth): add GetCurrentUser slice and integration auth helper`.

### PR 3 finish

- [ ] Full suite green → push → PR `feat(auth): JWT authentication, sign-in and current-user` (why-first body: stateless JWT, roles in claims, 401 on anonymous, Admin policy ready for admin routes) → squash-merge.

---

## PR 4 — Reference read slices  (`feat/reference-read-slices`)

**Outcome:** authenticated users list leave types; admins list employees; employees are forbidden from the employees endpoint.

### Task 4.1: `ListLeaveTypes` (feat, TDD via integration)

**Files:** `Features/Reference/ListLeaveTypes/{Endpoint,Response,Handler}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/ListLeaveTypesTests.cs`.

**Contract:**
- Route: `GET /api/leave-types`, **Authenticated**.
- `Response`: array of `LeaveTypeDto(Guid Id, string Name, string ColourHex, string RegisterableBy)` — ordered by `Name`. (Colour is data-driven for the FE.)

- [ ] **Step 1: Failing tests** — authenticated → 200 with the 4 seeded types incl. colours; anonymous → 401.
- [ ] **Step 2: FAIL → Step 3: implement (read from `LeaveDbContext`, project to DTO, no entity leakage) → Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat(reference): add ListLeaveTypes slice`.

### Task 4.2: `ListEmployees` (admin) (feat, TDD via integration)

**Files:** `Features/Reference/ListEmployees/{Endpoint,Response,Handler}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/ListEmployeesTests.cs`.

**Contract:**
- Route: `GET /api/employees`, **Admin** (`.RequireAuthorization("Admin")`).
- `Response`: array of `EmployeeDto(Guid Id, string Name, string Role)` — ordered by `Name`. **Never** expose `PasswordHash`/`Username`.

- [ ] **Step 1: Failing tests** — admin → 200 with seeded employees; employee role → 403; anonymous → 401.
- [ ] **Step 2: FAIL → Step 3: implement → Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat(reference): add ListEmployees admin slice`.

### PR 4 finish

- [ ] Suite green → push → PR `feat(reference): leave-types and employees read slices` → squash-merge.

---

## PR 5 — Calendar  (`feat/calendar-view`)

**Outcome:** any authenticated user sees every registration intersecting a date window (multi-day leave spanning a month boundary still shows).

### Task 5.1: `ViewCalendar` (feat, TDD via integration)

**Files:** `Features/Calendar/ViewCalendar/{Endpoint,Request,Response,Handler}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/ViewCalendarTests.cs`.

**Contract:**
- Route: `GET /api/calendar?from={ISO date}&to={ISO date}`, **Authenticated**.
- `Request`: bound from query (`DateOnly From`, `DateOnly To`). `Validator`: `To >= From` (→ 400).
- **Window-intersection rule:** return registrations where `StartDate <= to AND from <= EndDate` (reuse the same inclusive logic as `LeavePeriod.Overlaps`).
- `Response`: array of `CalendarEntryDto(Guid Id, Guid EmployeeId, string EmployeeName, Guid LeaveTypeId, string LeaveTypeName, string ColourHex, string StartDate, string EndDate)`. Dates serialised ISO `YYYY-MM-DD`. Join employee + leave type for display fields.

- [ ] **Step 1: Failing tests** — seed two registrations (one inside window, one fully outside) → only the intersecting one returns; a registration **spanning a month boundary** queried with an in-month window is **included**; `to < from` → 400; anonymous → 401.
- [ ] **Step 2: FAIL → Step 3: implement (EF query with the intersection predicate, projection to DTO) → Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat(calendar): add ViewCalendar window-intersection slice`.

### PR 5 finish

- [ ] Suite green → push → PR `feat(calendar): calendar window view` → squash-merge.

---

## PR 6 — My leave: list + register  (`feat/my-leave-register`)

**Outcome:** an employee lists their own leave and registers new leave with all four Domain rules enforced and mapped to the correct status codes. **`RegisterMyLeave` is the canonical write-slice template — PRs 7 and 8 follow its anatomy exactly.**

### Task 6.1: `ListMyLeave` (feat, TDD via integration)

**Files:** `Features/Leave/ListMyLeave/{Endpoint,Response,Handler}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/ListMyLeaveTests.cs`.

**Contract:**
- Route: `GET /api/me/leave`, **Authenticated**. Scope to `ICurrentUser.EmployeeId`.
- `Response`: array of `MyLeaveDto(Guid Id, Guid LeaveTypeId, string LeaveTypeName, string ColourHex, string StartDate, string EndDate, string? Description, string? Notes)` — sorted `StartDate` descending. ISO dates.

- [ ] **Step 1: Failing tests** — returns only the caller's registrations (seed leave for two employees; assert isolation); anonymous → 401.
- [ ] **Step 2: FAIL → Step 3: implement → Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat(leave): add ListMyLeave slice`.

### Task 6.2: `RegisterMyLeave` — the template write slice (feat, TDD via integration)

**Files:** `Features/Leave/RegisterMyLeave/{Endpoint,Request,Response,Handler,Validator}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/RegisterMyLeaveTests.cs`.

**Contract:**
- Route: `POST /api/me/leave`, **Authenticated**.
- `Request(Guid LeaveTypeId, DateOnly StartDate, DateOnly EndDate, string? Description, string? Notes)`.
- `Validator` (→ 400): `LeaveTypeId` non-empty; `EndDate >= StartDate`; `Description` ≤ 50; `Notes` ≤ 500.
- `Handler` orchestration (load → Domain invariants → persist → map), in this order:
  1. Load `LeaveType` by id; if not found → **404**.
  2. `LeaveRules.EnsureEndOnOrAfterStart(start, end)` (defence-in-depth; 422 `END_BEFORE_START` if the validator was bypassed).
  3. `LeaveRules.EnsureTypeRegisterableBy(type, currentUser.Role)` → 422 `TYPE_NOT_REGISTERABLE`.
  4. `LeaveRules.EnsureStartTodayOrFuture(start, clock.Today)` → 422 `START_DATE_IN_PAST`.
  5. Load the caller's existing registrations; `LeaveRules.EnsureNoOverlap(new LeavePeriod(start, end), existing)` → 422 `OVERLAP`.
  6. Persist a new `LeaveRegistration { EmployeeId = currentUser.EmployeeId, ... }` in one `SaveChangesAsync`.
- `Response(Guid Id, Guid LeaveTypeId, string StartDate, string EndDate, string? Description, string? Notes)` — 201 Created.

- [ ] **Step 1: Write failing integration tests**
  - happy path (future Vacation) → 201, persisted, returned with ISO dates.
  - overlapping the caller's existing leave → 422 with `code == "OVERLAP"`.
  - past start date → 422 `START_DATE_IN_PAST`.
  - employee registering "Public Holiday" (Admin-only type) → 422 `TYPE_NOT_REGISTERABLE`.
  - `EndDate < StartDate` → 400.
  - `Description` 51 chars → 400.
  - unknown `LeaveTypeId` → 404.
  - anonymous → 401.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement the full slice.** Reference implementation (the shape every later write slice copies):

```csharp
// Features/Leave/RegisterMyLeave/Endpoint.cs
using LeaveCalendar.Web.Common;
namespace LeaveCalendar.Web.Features.Leave.RegisterMyLeave;
public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/api/me/leave", Handler.HandleAsync)
           .AddEndpointFilter<ValidationFilter<Request>>()
           .RequireAuthorization()
           .WithTags("MyLeave");
}

// Features/Leave/RegisterMyLeave/Request.cs
namespace LeaveCalendar.Web.Features.Leave.RegisterMyLeave;
public sealed record Request(Guid LeaveTypeId, DateOnly StartDate, DateOnly EndDate, string? Description, string? Notes);

// Features/Leave/RegisterMyLeave/Response.cs
namespace LeaveCalendar.Web.Features.Leave.RegisterMyLeave;
public sealed record Response(Guid Id, Guid LeaveTypeId, string StartDate, string EndDate, string? Description, string? Notes);

// Features/Leave/RegisterMyLeave/Validator.cs
using FluentValidation;
namespace LeaveCalendar.Web.Features.Leave.RegisterMyLeave;
public sealed class Validator : AbstractValidator<Request>
{
    public Validator()
    {
        RuleFor(x => x.LeaveTypeId).NotEmpty();
        RuleFor(x => x.EndDate).GreaterThanOrEqualTo(x => x.StartDate);
        RuleFor(x => x.Description).MaximumLength(50);
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

// Features/Leave/RegisterMyLeave/Handler.cs
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using LeaveCalendar.Web.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Features.Leave.RegisterMyLeave;
public static class Handler
{
    public static async Task<IResult> HandleAsync(Request request, LeaveDbContext db, ICurrentUser user, IClock clock, CancellationToken ct)
    {
        var type = await db.LeaveTypes.FirstOrDefaultAsync(t => t.Id == request.LeaveTypeId, ct);
        if (type is null) return Results.NotFound();

        LeaveRules.EnsureEndOnOrAfterStart(request.StartDate, request.EndDate);
        LeaveRules.EnsureTypeRegisterableBy(type, user.Role);
        LeaveRules.EnsureStartTodayOrFuture(request.StartDate, clock.Today);

        var existing = await db.LeaveRegistrations.Where(r => r.EmployeeId == user.EmployeeId).ToListAsync(ct);
        LeaveRules.EnsureNoOverlap(new LeavePeriod(request.StartDate, request.EndDate), existing);

        var reg = new LeaveRegistration
        {
            Id = Guid.NewGuid(),
            EmployeeId = user.EmployeeId,
            LeaveTypeId = request.LeaveTypeId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Description = request.Description,
            Notes = request.Notes
        };
        db.LeaveRegistrations.Add(reg);
        await db.SaveChangesAsync(ct);

        var response = new Response(reg.Id, reg.LeaveTypeId,
            reg.StartDate.ToString("yyyy-MM-dd"), reg.EndDate.ToString("yyyy-MM-dd"), reg.Description, reg.Notes);
        return Results.Created($"/api/me/leave/{reg.Id}", response);
    }
}
```

- [ ] **Step 4: Run → PASS** (all 8 cases green).
- [ ] **Step 5: Commit** — `feat(leave): add RegisterMyLeave slice enforcing all leave rules`.

### PR 6 finish

- [ ] Suite green → push → PR `feat(leave): my-leave list and register` (why-first body: the canonical write slice; the no-overlap rule — the highest-value target — is now exercised end-to-end against real PostgreSQL) → squash-merge.

---

## PR 7 — My leave: edit + delete  (`feat/my-leave-edit-delete`)

**Outcome:** an employee edits/deletes **only their own, future-dated** leave; another employee's leave is invisible (404); past-dated own leave is immutable.

> Both slices follow the **RegisterMyLeave template** (Endpoint+Request/Response+Handler+Validator). Where behaviour matches the template, copy its shape; the deltas are spelled out below.

### Task 7.1: `EditMyLeave` (feat, TDD via integration)

**Files:** `Features/Leave/EditMyLeave/{Endpoint,Request,Response,Handler,Validator}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/EditMyLeaveTests.cs`.

**Contract:**
- Route: `PUT /api/me/leave/{id:guid}`, **Authenticated**.
- `Request(Guid LeaveTypeId, DateOnly StartDate, DateOnly EndDate, string? Description, string? Notes)`; `Validator` identical to RegisterMyLeave.
- `Handler` order:
  1. Load registration by `id` **scoped to `user.EmployeeId`**; if not found → **404** (this also hides other employees' leave — satisfies "cannot edit another's").
  2. `LeaveRules.EnsureEditableByEmployee(existingReg, clock.Today)` → 422 `LEAVE_NOT_MODIFIABLE` if the **existing** start date is in the past.
  3. Load `LeaveType`; if missing → 404. `EnsureEndOnOrAfterStart`, `EnsureTypeRegisterableBy`, `EnsureStartTodayOrFuture` (new start must be today/future).
  4. `EnsureNoOverlap(new LeavePeriod(start, end), callersRegistrations, excludingId: id)` — **exclude self** so editing in place isn't a self-overlap.
  5. Mutate + `SaveChangesAsync`. `Response` mirrors `MyLeaveDto`. 200 OK.

- [ ] **Step 1: Failing tests** — edit own future leave (new dates) → 200, persisted; editing to overlap **another** of the caller's registrations → 422 `OVERLAP`; editing in place (same dates) → 200 (self excluded); editing own **past** leave → 422 `LEAVE_NOT_MODIFIABLE`; editing **another employee's** registration id → 404; new start in past → 422 `START_DATE_IN_PAST`; anonymous → 401.
- [ ] **Step 2: FAIL → Step 3: implement (template shape; deltas above) → Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat(leave): add EditMyLeave slice for own future-dated leave`.

### Task 7.2: `DeleteMyLeave` (feat, TDD via integration)

**Files:** `Features/Leave/DeleteMyLeave/{Endpoint,Handler}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/DeleteMyLeaveTests.cs`.

**Contract:**
- Route: `DELETE /api/me/leave/{id:guid}`, **Authenticated**.
- `Handler`: load registration scoped to `user.EmployeeId`; if missing → 404; `EnsureEditableByEmployee(reg, clock.Today)` → 422 `LEAVE_NOT_MODIFIABLE` for past leave; else remove + save → **204 No Content**.

- [ ] **Step 1: Failing tests** — delete own future leave → 204, gone; delete own past leave → 422 `LEAVE_NOT_MODIFIABLE`; delete another employee's id → 404; anonymous → 401.
- [ ] **Step 2: FAIL → Step 3: implement → Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat(leave): add DeleteMyLeave slice for own future-dated leave`.

### PR 7 finish

- [ ] Suite green → push → PR `feat(leave): edit and delete own future-dated leave` → squash-merge.

---

## PR 8 — Admin leave management  (`feat/admin-leave-management`)

**Outcome:** admins manage any employee's leave across all types (overlap still enforced); employees are forbidden from every `/api/admin/*` route; the admin list is paged, filtered and sorted.

> Write slices follow the **RegisterMyLeave template**; the admin delta is: target employee comes from the request, the employee-only date restriction (`EnsureStartTodayOrFuture`, `EnsureEditableByEmployee`) is **not** applied, but `EnsureNoOverlap` and `EnsureEndOnOrAfterStart` **still** apply. All routes use `.RequireAuthorization("Admin")`.

### Task 8.1: `ListAllLeave` — paged + filtered (feat, TDD via integration)

**Files:** `Features/Admin/ListAllLeave/{Endpoint,Request,Response,Handler}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/ListAllLeaveTests.cs`.

**Contract:**
- Route: `GET /api/admin/leave?employeeId=&leaveTypeId=&from=&to=&page=1&pageSize=20`, **Admin**.
- `leaveTypeId` is **repeatable** (multi-select). Optional `employeeId`, `from`, `to`. Defaults: `page=1`, `pageSize=20`. Sort by `StartDate` **descending**.
- `Response`: `PagedResult<AdminLeaveDto>(IReadOnlyList<AdminLeaveDto> Items, int Page, int PageSize, int TotalCount, int TotalPages)` where `AdminLeaveDto(Guid Id, Guid EmployeeId, string EmployeeName, Guid LeaveTypeId, string LeaveTypeName, string ColourHex, string StartDate, string EndDate, string? Description, string? Notes)`.
- Changing a filter resets to page 1 (a client concern, but the handler must compute `TotalPages = ceil(TotalCount/pageSize)` correctly and clamp `page`).

- [ ] **Step 1: Failing tests** — seed leave for two employees across types; no filter → all, sorted start desc, correct envelope; filter by `employeeId` → only that employee; filter by multiple `leaveTypeId` → union of those types; `from`/`to` window narrows results; pagination (`pageSize=1`) returns one item with `TotalCount`/`TotalPages` correct; employee role → 403; anonymous → 401.
- [ ] **Step 2: FAIL → Step 3: implement (compose `IQueryable` filters, `CountAsync`, `Skip/Take`, project to DTO) → Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat(admin): add ListAllLeave with filtering and pagination`.

### Task 8.2: `AdminCreateLeave` (feat, TDD via integration)

**Files:** `Features/Admin/AdminCreateLeave/{Endpoint,Request,Response,Handler,Validator}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/AdminCreateLeaveTests.cs`.

**Contract:**
- Route: `POST /api/admin/leave`, **Admin**.
- `Request(Guid EmployeeId, Guid LeaveTypeId, DateOnly StartDate, DateOnly EndDate, string? Description, string? Notes)`; `Validator`: `EmployeeId` + `LeaveTypeId` non-empty, `EndDate >= StartDate`, lengths 50/500.
- `Handler`: load employee → 404 if missing; load type → 404 if missing; `EnsureEndOnOrAfterStart`; **no** date/type-eligibility restriction (admin is unrestricted, `EnsureTypeRegisterableBy(type, Role.Admin)` is a no-op so may be called harmlessly); `EnsureNoOverlap` against **that employee's** existing leave (excludingId none); persist; 201.

- [ ] **Step 1: Failing tests** — admin creates leave for an employee (incl. a past start date) → 201; admin creates an Admin-only "Public Holiday" for an employee → 201; overlapping that employee's existing leave → 422 `OVERLAP`; `EndDate < StartDate` → 400; employee role → 403.
- [ ] **Step 2: FAIL → Step 3: implement → Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat(admin): add AdminCreateLeave slice`.

### Task 8.3: `AdminEditLeave` (feat, TDD via integration)

**Files:** `Features/Admin/AdminEditLeave/{Endpoint,Request,Response,Handler,Validator}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/AdminEditLeaveTests.cs`.

**Contract:**
- Route: `PUT /api/admin/leave/{id:guid}`, **Admin**.
- `Handler`: load registration by id (any employee) → 404 if missing; load type → 404; `EnsureEndOnOrAfterStart`; `EnsureNoOverlap` against the **registration's employee's** other leave with `excludingId: id`; **no** future-date restriction; persist; 200.

- [ ] **Step 1: Failing tests** — admin edits any employee's leave (incl. past dates) → 200; edit causing overlap with that employee's other leave → 422 `OVERLAP`; edit in place → 200 (self excluded); unknown id → 404; employee role → 403.
- [ ] **Step 2: FAIL → Step 3: implement → Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat(admin): add AdminEditLeave slice`.

### Task 8.4: `AdminDeleteLeave` (feat, TDD via integration)

**Files:** `Features/Admin/AdminDeleteLeave/{Endpoint,Handler}.cs` (`git rm` placeholder). Test `IntegrationTests/Features/AdminDeleteLeaveTests.cs`.

**Contract:**
- Route: `DELETE /api/admin/leave/{id:guid}`, **Admin**.
- `Handler`: load by id (any employee) → 404 if missing; remove + save → 204. No date restriction.

- [ ] **Step 1: Failing tests** — admin deletes any employee's leave (incl. past) → 204, gone; unknown id → 404; employee role → 403.
- [ ] **Step 2: FAIL → Step 3: implement → Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat(admin): add AdminDeleteLeave slice`.

### PR 8 finish

- [ ] Full suite green (`dotnet test src/backend/LeaveCalendar.sln`) → push → PR `feat(admin): admin leave management (list, create, edit, delete)` (why-first body: completes the authorisation boundary — admins manage anyone, employees get 403 on all admin routes; overlap still enforced for admin) → squash-merge.

---

## Backend complete — coverage check

After PR 8, every backend slice in the architecture's API surface (§7) exists and is tested:

| Slice | PR | Auth | 422 codes exercised |
| --- | --- | --- | --- |
| SignIn | 3 | Anonymous | — (401 on bad creds) |
| GetCurrentUser | 3 | Authenticated | — |
| ListLeaveTypes | 4 | Authenticated | — |
| ListEmployees | 4 | Admin | — |
| ViewCalendar | 5 | Authenticated | — |
| ListMyLeave | 6 | Authenticated | — |
| RegisterMyLeave | 6 | Authenticated | OVERLAP, START_DATE_IN_PAST, TYPE_NOT_REGISTERABLE |
| EditMyLeave | 7 | Authenticated | OVERLAP, START_DATE_IN_PAST, LEAVE_NOT_MODIFIABLE |
| DeleteMyLeave | 7 | Authenticated | LEAVE_NOT_MODIFIABLE |
| ListAllLeave | 8 | Admin | — |
| AdminCreateLeave | 8 | Admin | OVERLAP |
| AdminEditLeave | 8 | Admin | OVERLAP |
| AdminDeleteLeave | 8 | Admin | — |

**Quality-tree (arc42 §10) traceability:** Q1 overlap/past/type/adjacency/1-day → PR 1 unit + PR 6/7/8 integration; Q3 401/403/ownership → PR 3/4/8 integration; Q5 Domain testable without DB → PR 1. Performance targets (§10), `/swagger` contract publishing, and the deployment view (§7) are downstream of this backend and out of scope for these PRs.

**Deferred / out of scope for this plan** (flag to the team): admin CRUD for leave types (AD-7 open question), refresh tokens & token lifetime tuning (§8.1), audit logging / GDPR (§8.1 open), metrics/tracing/log aggregation (§8.4), and the deployment pipeline (§7). The frontend (React SPA) and Cypress E2E suite are separate workstreams.
