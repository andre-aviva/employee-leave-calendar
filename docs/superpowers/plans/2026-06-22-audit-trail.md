# Audit Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist a durable, append-only audit trail of every leave-registration write (admin + self-service) — who/when/before-after — and expose it through an admin-only read endpoint.

**Architecture:** A hand-rolled EF Core `SaveChangesInterceptor` watches the `ChangeTracker` for `LeaveRegistration` Insert/Update/Delete and writes one `AuditLogEntry` per change into the *same* `SaveChanges` (one transaction, so a write is never persisted unaudited). The actor is resolved from the JWT principal via `IAuditActorProvider` (falling back to a `System` sentinel for non-request writes). A standard vertical slice (`ViewAuditTrail`) serves the trail. No third-party audit library.

**Tech Stack:** .NET 10, EF Core 10 (Npgsql), PostgreSQL, xUnit + FluentAssertions, Testcontainers. Design spec: `docs/superpowers/specs/2026-06-22-audit-trail-design.md`.

## Global Constraints

- **Target framework:** `net10.0`; EF Core `10.0.2` (already referenced). **No new NuGet packages** — interceptor uses EF Core + `System.Text.Json` only.
- **Schema naming:** snake_case **table** names, EF-default **PascalCase columns** (e.g. `leave_registrations."EmployeeId"`). The new table is `audit_log`.
- **Enum-in-DB convention:** store enums via `HasConversion<string>()` + a `CK_<table>_<Column>` check constraint (mirror `CK_employees_Role`).
- **`audit_log` has NO foreign keys** — audit rows must outlive the registration/employee they reference.
- **Append-only:** no update/delete code paths touch `audit_log`.
- **Actor sentinel:** non-request writes (no authenticated `HttpContext`) record actor `System` with `ActorEmployeeId = null`, `ActorName = "System"`, `ActorRole = "System"`.
- **Atomicity:** the `AuditLogEntry` is added to the audited `DbContext` inside `SavingChanges`, so it commits in the same `SaveChanges`/transaction (never a separate write).
- **Only `LeaveRegistration` is audited** this round. The interceptor must ignore every other entity (and therefore never audit `AuditLogEntry` itself → no recursion).
- **Git:** the controller has already created and checked out `feat/audit-trail` (branched off `docs/audit-trail-design`, so the spec and plan travel with the implementation and land in a single feature PR — no separate docs PR). Make atomic Conventional Commits; do **not** create or switch branches. The PR squash-merges to `main`.
- **Build/test commands:** full suite `dotnet test src/backend/LeaveCalendar.sln`; focused `dotnet test src/backend/LeaveCalendar.IntegrationTests --filter "FullyQualifiedName~<Class>"`. Integration tests require a running Docker/Podman (Testcontainers).
- **Seeded fixtures** (from `DbSeeder`, available in tests):
  - Alice Admin — `22222222-0000-0000-0000-000000000001`, `admin` / `Admin!123`, role `Admin`.
  - Eddie Employee — `22222222-0000-0000-0000-000000000002`, `employee` / `Employee!123`, role `Employee`.
  - Nora Newbie — `22222222-0000-0000-0000-000000000003`, `nora` / `Employee!123`, role `Employee`.
  - Vacation type — `11111111-0000-0000-0000-000000000001`; Sick Leave type — `11111111-0000-0000-0000-000000000002`.
  - `ApiFactory.FakeToday` = `2026-06-15` (the fixed `IClock.Today`).

---

### Task 1: Audit entity, action enum, EF mapping, migration

**Files:**
- Create: `src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditAction.cs`
- Create: `src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditLogEntry.cs`
- Create: `src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditLogConfiguration.cs`
- Modify: `src/backend/LeaveCalendar.Web/Infrastructure/Persistence/LeaveDbContext.cs`
- Create (generated): `src/backend/LeaveCalendar.Web/Migrations/<timestamp>_AddAuditLog.cs`
- Test: `src/backend/LeaveCalendar.IntegrationTests/Features/AuditLogSchemaTests.cs`

**Interfaces:**
- Produces: `enum AuditAction { Insert, Update, Delete }`; `sealed class AuditLogEntry` with `Guid Id`, `DateTimeOffset OccurredAt`, `AuditAction Action`, `Guid EntityId`, `Guid SubjectEmployeeId`, `Guid? ActorEmployeeId`, `string ActorName`, `string ActorRole`, `string Changes`; `LeaveDbContext.AuditLog` (`DbSet<AuditLogEntry>`).

- [ ] **Step 1: Confirm the feature branch**

The controller has already created and checked out `feat/audit-trail`. Verify you are on it; do **not** create or switch branches:

```bash
cd /Users/saber/dev/employee-leave-calendar
git branch --show-current   # expect: feat/audit-trail
```

- [ ] **Step 2: Write the failing schema test**

Create `src/backend/LeaveCalendar.IntegrationTests/Features/AuditLogSchemaTests.cs`:

```csharp
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LeaveCalendar.IntegrationTests.Features;

public class AuditLogSchemaTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task AuditLog_table_exists_and_is_queryable()
    {
        await Factory.ResetAsync();
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();

        var count = await ctx.AuditLog.CountAsync();

        count.Should().Be(0);
    }
}
```

- [ ] **Step 3: Run it to verify it fails to compile**

Run: `dotnet test src/backend/LeaveCalendar.IntegrationTests --filter "FullyQualifiedName~AuditLogSchemaTests"`
Expected: FAIL — `LeaveDbContext` has no member `AuditLog` (compile error).

- [ ] **Step 4: Create the `AuditAction` enum**

`src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditAction.cs`:

```csharp
namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>The kind of state transition captured in the audit trail.</summary>
public enum AuditAction
{
    Insert,
    Update,
    Delete
}
```

- [ ] **Step 5: Create the `AuditLogEntry` entity**

`src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditLogEntry.cs`:

```csharp
namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>
/// One append-only audit record for a single LeaveRegistration state change. Plain
/// persistence entity — no behaviour, no foreign keys (a record must outlive the row it
/// describes). <see cref="Changes"/> is a JSON document: changed columns (old→new) for
/// updates, the full column set for inserts/deletes.
/// </summary>
public sealed class AuditLogEntry
{
    public Guid Id { get; init; }
    public DateTimeOffset OccurredAt { get; init; }
    public AuditAction Action { get; init; }
    public Guid EntityId { get; init; }
    public Guid SubjectEmployeeId { get; init; }
    public Guid? ActorEmployeeId { get; init; }
    public required string ActorName { get; init; }
    public required string ActorRole { get; init; }
    public required string Changes { get; init; }
}
```

- [ ] **Step 6: Create the EF configuration**

`src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditLogConfiguration.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LeaveCalendar.Web.Infrastructure.Auditing;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLogEntry>
{
    public void Configure(EntityTypeBuilder<AuditLogEntry> a)
    {
        // The DB independently rejects out-of-range Action values (defence in depth, same
        // pattern as employees.Role). Values are the AuditAction enum names stored by
        // HasConversion<string>(); the column is quoted because EF maps it PascalCase.
        a.ToTable("audit_log", tb =>
            tb.HasCheckConstraint("CK_audit_log_Action", "\"Action\" IN ('Insert', 'Update', 'Delete')"));
        a.HasKey(x => x.Id);
        a.Property(x => x.OccurredAt).IsRequired();
        a.Property(x => x.Action).HasConversion<string>().HasMaxLength(20).IsRequired();
        a.Property(x => x.EntityId).IsRequired();
        a.Property(x => x.SubjectEmployeeId).IsRequired();
        a.Property(x => x.ActorEmployeeId);
        a.Property(x => x.ActorName).IsRequired().HasMaxLength(200);
        a.Property(x => x.ActorRole).IsRequired().HasMaxLength(50);
        a.Property(x => x.Changes).HasColumnType("jsonb").IsRequired();
        // Primary read path: newest-first for one data subject. No FKs by design.
        a.HasIndex(x => new { x.SubjectEmployeeId, x.OccurredAt });
    }
}
```

- [ ] **Step 7: Add the `DbSet` to `LeaveDbContext`**

Modify `src/backend/LeaveCalendar.Web/Infrastructure/Persistence/LeaveDbContext.cs` — add the using and the DbSet line (the existing `ApplyConfigurationsFromAssembly` already discovers `AuditLogConfiguration`):

```csharp
using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Domain.LeaveTypes;
using LeaveCalendar.Web.Infrastructure.Auditing;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Infrastructure.Persistence;
public sealed class LeaveDbContext(DbContextOptions<LeaveDbContext> options) : DbContext(options)
{
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
    public DbSet<LeaveRegistration> LeaveRegistrations => Set<LeaveRegistration>();
    public DbSet<AuditLogEntry> AuditLog => Set<AuditLogEntry>();
    protected override void OnModelCreating(ModelBuilder b) => b.ApplyConfigurationsFromAssembly(typeof(LeaveDbContext).Assembly);
}
```

- [ ] **Step 8: Generate the migration**

(Requires `dotnet-ef`; `dotnet tool install --global dotnet-ef` if missing.)

```bash
cd src/backend
dotnet ef migrations add AddAuditLog --project LeaveCalendar.Web --startup-project LeaveCalendar.Web -o Migrations
cd ../..
```

- [ ] **Step 9: Verify the generated migration**

Open the new `src/backend/LeaveCalendar.Web/Migrations/<timestamp>_AddAuditLog.cs`. Its `Up` must match:

```csharp
migrationBuilder.CreateTable(
    name: "audit_log",
    columns: table => new
    {
        Id = table.Column<Guid>(type: "uuid", nullable: false),
        OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
        Action = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
        EntityId = table.Column<Guid>(type: "uuid", nullable: false),
        SubjectEmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
        ActorEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
        ActorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
        ActorRole = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
        Changes = table.Column<string>(type: "jsonb", nullable: false)
    },
    constraints: table =>
    {
        table.PrimaryKey("PK_audit_log", x => x.Id);
        table.CheckConstraint("CK_audit_log_Action", "\"Action\" IN ('Insert', 'Update', 'Delete')");
    });

migrationBuilder.CreateIndex(
    name: "IX_audit_log_SubjectEmployeeId_OccurredAt",
    table: "audit_log",
    columns: new[] { "SubjectEmployeeId", "OccurredAt" });
```

If anything differs (e.g. an unexpected FK), fix the configuration in Step 6 and regenerate (`dotnet ef migrations remove --project LeaveCalendar.Web --startup-project LeaveCalendar.Web` first).

- [ ] **Step 10: Run the schema test to verify it passes**

Run: `dotnet test src/backend/LeaveCalendar.IntegrationTests --filter "FullyQualifiedName~AuditLogSchemaTests"`
Expected: PASS (migration applied by the harness; `audit_log` exists and is empty).

- [ ] **Step 11: Commit**

```bash
git add src/backend/LeaveCalendar.Web/Infrastructure/Auditing src/backend/LeaveCalendar.Web/Infrastructure/Persistence/LeaveDbContext.cs src/backend/LeaveCalendar.Web/Migrations src/backend/LeaveCalendar.IntegrationTests/Features/AuditLogSchemaTests.cs
git commit -m "feat(audit): add audit_log entity, mapping, and migration"
```

---

### Task 2: Actor provider (who acted)

**Files:**
- Create: `src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditActor.cs`
- Create: `src/backend/LeaveCalendar.Web/Infrastructure/Auditing/IAuditActorProvider.cs`
- Create: `src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditActorProvider.cs`
- Test: `src/backend/LeaveCalendar.IntegrationTests/Features/AuditActorProviderTests.cs`

**Interfaces:**
- Consumes: `JwtClaimNames` (`Subject` = "sub", `Name` = "name", `Role` = "role").
- Produces: `sealed record AuditActor(Guid? EmployeeId, string Name, string Role)` with `static readonly AuditActor System`; `interface IAuditActorProvider { AuditActor GetCurrent(); }`; `sealed class AuditActorProvider(IHttpContextAccessor) : IAuditActorProvider`.

> Note: the test is a pure unit test but lives in the IntegrationTests project, which already
> references ASP.NET Core types (`IHttpContextAccessor`, `DefaultHttpContext`). It does **not**
> use `ApiFactory`/Docker.

- [ ] **Step 1: Write the failing tests**

Create `src/backend/LeaveCalendar.IntegrationTests/Features/AuditActorProviderTests.cs`:

```csharp
using System.Security.Claims;
using FluentAssertions;
using LeaveCalendar.Web.Infrastructure.Auditing;
using LeaveCalendar.Web.Infrastructure.Jwt;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace LeaveCalendar.IntegrationTests.Features;

public class AuditActorProviderTests
{
    private static AuditActorProvider ProviderFor(HttpContext? context) =>
        new(new HttpContextAccessor { HttpContext = context });

    [Fact]
    public void GetCurrent_noHttpContext_returns_System()
    {
        var actor = ProviderFor(null).GetCurrent();

        actor.Should().Be(AuditActor.System);
        actor.EmployeeId.Should().BeNull();
        actor.Name.Should().Be("System");
        actor.Role.Should().Be("System");
    }

    [Fact]
    public void GetCurrent_unauthenticated_returns_System()
    {
        var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) };

        ProviderFor(ctx).GetCurrent().Should().Be(AuditActor.System);
    }

    [Fact]
    public void GetCurrent_authenticated_returns_actor_from_claims()
    {
        var id = Guid.Parse("22222222-0000-0000-0000-000000000001");
        var identity = new ClaimsIdentity(
        [
            new Claim(JwtClaimNames.Subject, id.ToString()),
            new Claim(JwtClaimNames.Name, "Alice Admin"),
            new Claim(JwtClaimNames.Role, "Admin")
        ], authenticationType: "Test");
        var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };

        var actor = ProviderFor(ctx).GetCurrent();

        actor.EmployeeId.Should().Be(id);
        actor.Name.Should().Be("Alice Admin");
        actor.Role.Should().Be("Admin");
    }

    [Fact]
    public void GetCurrent_authenticated_but_nonGuid_sub_returns_System()
    {
        var identity = new ClaimsIdentity(
            [new Claim(JwtClaimNames.Subject, "not-a-guid")], authenticationType: "Test");
        var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };

        ProviderFor(ctx).GetCurrent().Should().Be(AuditActor.System);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `dotnet test src/backend/LeaveCalendar.IntegrationTests --filter "FullyQualifiedName~AuditActorProviderTests"`
Expected: FAIL — `AuditActor` / `IAuditActorProvider` / `AuditActorProvider` do not exist (compile error).

- [ ] **Step 3: Create `AuditActor`**

`src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditActor.cs`:

```csharp
namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>Who performed an audited change. <see cref="System"/> marks a non-request write.</summary>
public sealed record AuditActor(Guid? EmployeeId, string Name, string Role)
{
    public static readonly AuditActor System = new(null, "System", "System");
}
```

- [ ] **Step 4: Create `IAuditActorProvider`**

`src/backend/LeaveCalendar.Web/Infrastructure/Auditing/IAuditActorProvider.cs`:

```csharp
namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>The single seam for resolving "who" — the current request's actor, or System.</summary>
public interface IAuditActorProvider
{
    AuditActor GetCurrent();
}
```

- [ ] **Step 5: Create `AuditActorProvider`**

`src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditActorProvider.cs`:

```csharp
using System.Security.Claims;
using LeaveCalendar.Web.Infrastructure.Jwt;
using Microsoft.AspNetCore.Http;

namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>
/// Reads the actor straight off the request principal's JWT claims. Deliberately does NOT use
/// the scoped, throwing <c>ICurrentUser</c>: this is resolved from a singleton interceptor and
/// must never throw, falling back to <see cref="AuditActor.System"/> whenever there is no
/// authenticated context (startup paths, or rows seeded directly via the DbContext in tests).
/// </summary>
public sealed class AuditActorProvider(IHttpContextAccessor httpContextAccessor) : IAuditActorProvider
{
    public AuditActor GetCurrent()
    {
        var user = httpContextAccessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
            return AuditActor.System;

        if (!Guid.TryParse(user.FindFirstValue(JwtClaimNames.Subject), out var employeeId))
            return AuditActor.System;

        var name = user.FindFirstValue(JwtClaimNames.Name) ?? string.Empty;
        var role = user.FindFirstValue(JwtClaimNames.Role) ?? string.Empty;
        return new AuditActor(employeeId, name, role);
    }
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `dotnet test src/backend/LeaveCalendar.IntegrationTests --filter "FullyQualifiedName~AuditActorProviderTests"`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/backend/LeaveCalendar.Web/Infrastructure/Auditing src/backend/LeaveCalendar.IntegrationTests/Features/AuditActorProviderTests.cs
git commit -m "feat(audit): resolve the acting user from the request principal"
```

---

### Task 3: The interceptor + wiring (capture, atomicity, System path)

**Files:**
- Create: `src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditSaveChangesInterceptor.cs`
- Create: `src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditingRegistration.cs`
- Modify: `src/backend/LeaveCalendar.Web/Infrastructure/DependencyInjection.cs`
- Modify: `src/backend/LeaveCalendar.IntegrationTests/Infrastructure/ApiFactory.cs` (interceptor in the test DbContext + truncate `audit_log` on reset)
- Test: `src/backend/LeaveCalendar.IntegrationTests/Features/AuditTrailTests.cs`

**Interfaces:**
- Consumes: `AuditLogEntry`, `AuditAction`, `IAuditActorProvider`, `IClock`, `LeaveRegistration`, `LeaveDbContext.AuditLog`.
- Produces: `sealed class AuditSaveChangesInterceptor : SaveChangesInterceptor`; `static class AuditingRegistration` with `IServiceCollection AddAuditing(this IServiceCollection)` and `DbContextOptionsBuilder UseAuditing(this DbContextOptionsBuilder)`.

- [ ] **Step 1: Write the failing tests**

Create `src/backend/LeaveCalendar.IntegrationTests/Features/AuditTrailTests.cs`:

```csharp
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Auditing;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LeaveCalendar.IntegrationTests.Features;

public class AuditTrailTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private static readonly Guid AdminId    = Guid.Parse("22222222-0000-0000-0000-000000000001");
    private static readonly Guid EddieId    = Guid.Parse("22222222-0000-0000-0000-000000000002");
    private static readonly Guid Vacation   = Guid.Parse("11111111-0000-0000-0000-000000000001");
    private static readonly Guid SickLeave  = Guid.Parse("11111111-0000-0000-0000-000000000002");

    private record EditRequest(Guid LeaveTypeId, string StartDate, string EndDate,
        string? Description = null, string? Notes = null);

    // Adds a registration straight through the DbContext (no HTTP request → System actor),
    // mirroring the existing SeedRegistrationAsync helpers.
    private async Task<Guid> SeedRegistrationAsync(Guid employeeId, DateOnly start, DateOnly end)
    {
        var id = Guid.NewGuid();
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        ctx.LeaveRegistrations.Add(new LeaveRegistration
        {
            Id = id, EmployeeId = employeeId, LeaveTypeId = Vacation, StartDate = start, EndDate = end
        });
        await ctx.SaveChangesAsync();
        return id;
    }

    private async Task<List<AuditLogEntry>> AuditRowsAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        return await ctx.AuditLog.OrderBy(x => x.OccurredAt).ToListAsync();
    }

    [Fact]
    public async Task DirectDbWrite_records_a_System_Insert()
    {
        await Factory.ResetAsync();

        var regId = await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));

        var rows = await AuditRowsAsync();
        rows.Should().ContainSingle();
        var row = rows[0];
        row.Action.Should().Be(AuditAction.Insert);
        row.EntityId.Should().Be(regId);
        row.SubjectEmployeeId.Should().Be(EddieId);
        row.ActorEmployeeId.Should().BeNull();
        row.ActorName.Should().Be("System");
        row.ActorRole.Should().Be("System");
    }

    [Fact]
    public async Task AdminEdit_records_an_Update_attributed_to_the_admin()
    {
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));

        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await client.PutAsJsonAsync($"/api/admin/leave/{regId}",
            new EditRequest(SickLeave, "2026-07-10", "2026-07-15"));
        response.EnsureSuccessStatusCode();

        var update = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Update);
        update.EntityId.Should().Be(regId);
        update.SubjectEmployeeId.Should().Be(EddieId);   // whose leave
        update.ActorEmployeeId.Should().Be(AdminId);     // who changed it (≠ subject)
        update.ActorName.Should().Be("Alice Admin");
        update.ActorRole.Should().Be("Admin");

        using var changes = JsonDocument.Parse(update.Changes);
        changes.RootElement.TryGetProperty("StartDate", out _).Should().BeTrue();
        changes.RootElement.TryGetProperty("EndDate", out _).Should().BeTrue();
        changes.RootElement.TryGetProperty("LeaveTypeId", out _).Should().BeTrue();
    }

    [Fact]
    public async Task FailedWrite_rolls_back_both_the_mutation_and_its_audit_row()
    {
        await Factory.ResetAsync();
        // A is valid. B overlaps A for the same employee → violates the DB exclusion constraint
        // on SaveChanges. Both B and B's audit row must roll back together (same transaction).
        await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 10));

        using (var scope = Factory.Services.CreateScope())
        {
            var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
            ctx.LeaveRegistrations.Add(new LeaveRegistration
            {
                Id = Guid.NewGuid(), EmployeeId = EddieId, LeaveTypeId = Vacation,
                StartDate = new DateOnly(2026, 7, 5), EndDate = new DateOnly(2026, 7, 8)   // overlaps A
            });
            var act = async () => await ctx.SaveChangesAsync();
            await act.Should().ThrowAsync<DbUpdateException>();
        }

        using var verify = Factory.Services.CreateScope();
        var db = verify.ServiceProvider.GetRequiredService<LeaveDbContext>();
        (await db.LeaveRegistrations.CountAsync()).Should().Be(1);  // only A
        (await db.AuditLog.CountAsync()).Should().Be(1);            // only A's Insert; B's rolled back
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `dotnet test src/backend/LeaveCalendar.IntegrationTests --filter "FullyQualifiedName~AuditTrailTests"`
Expected: FAIL — `AuditSaveChangesInterceptor`/`AuditingRegistration` missing (compile error), or (once those exist but unwired) zero audit rows.

- [ ] **Step 3: Create the interceptor**

`src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditSaveChangesInterceptor.cs`:

```csharp
using System.Text.Json;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Web.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>
/// Writes one <see cref="AuditLogEntry"/> per LeaveRegistration change into the SAME
/// <see cref="DbContext.SaveChanges"/> as the change itself, so a write is never persisted
/// unaudited (D7). Stateless: resolves <see cref="IClock"/> and <see cref="IAuditActorProvider"/>
/// from the application service provider at call time, which keeps it compatible with Aspire's
/// pooled DbContext (pooling forbids injecting services into the context constructor). Only
/// <see cref="LeaveRegistration"/> is inspected, so the audit rows it adds are never re-audited.
/// </summary>
public sealed class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        if (eventData.Context is not null) AddAuditEntries(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null) AddAuditEntries(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void AddAuditEntries(DbContext context)
    {
        // Accessing Entries<T>() runs change detection, so Modified/Added/Deleted are accurate.
        var entries = context.ChangeTracker
            .Entries<LeaveRegistration>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();
        if (entries.Count == 0) return;

        var services = context.GetService<IDbContextOptions>()
            .FindExtension<CoreOptionsExtension>()?.ApplicationServiceProvider
            ?? throw new InvalidOperationException(
                "Audit interceptor could not resolve the application service provider.");
        var occurredAt = services.GetRequiredService<IClock>().Now;
        var actor = services.GetRequiredService<IAuditActorProvider>().GetCurrent();

        foreach (var entry in entries)
        {
            var action = entry.State switch
            {
                EntityState.Added => AuditAction.Insert,
                EntityState.Modified => AuditAction.Update,
                _ => AuditAction.Delete
            };
            context.Add(new AuditLogEntry
            {
                Id = Guid.NewGuid(),
                OccurredAt = occurredAt,
                Action = action,
                EntityId = entry.Entity.Id,
                SubjectEmployeeId = entry.Entity.EmployeeId,
                ActorEmployeeId = actor.EmployeeId,
                ActorName = actor.Name,
                ActorRole = actor.Role,
                Changes = SerializeChanges(entry, action)
            });
        }
    }

    private static string SerializeChanges(EntityEntry<LeaveRegistration> entry, AuditAction action)
    {
        var changes = new Dictionary<string, object?>();
        foreach (var prop in entry.Properties)
        {
            var name = prop.Metadata.Name;
            switch (action)
            {
                case AuditAction.Insert:
                    changes[name] = prop.CurrentValue;
                    break;
                case AuditAction.Delete:
                    changes[name] = prop.OriginalValue;
                    break;
                case AuditAction.Update when prop.IsModified:
                    changes[name] = new { old = prop.OriginalValue, @new = prop.CurrentValue };
                    break;
            }
        }
        return JsonSerializer.Serialize(changes);
    }
}
```

- [ ] **Step 4: Create the registration helpers**

`src/backend/LeaveCalendar.Web/Infrastructure/Auditing/AuditingRegistration.cs`:

```csharp
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Infrastructure.Auditing;

/// <summary>
/// Wires the audit subsystem. <see cref="AddAuditing"/> registers the actor provider in DI;
/// <see cref="UseAuditing"/> attaches the interceptor to a DbContext's options. Both the
/// production registration and the integration-test harness call <see cref="UseAuditing"/> so
/// the trail is captured identically in each.
/// </summary>
public static class AuditingRegistration
{
    public static IServiceCollection AddAuditing(this IServiceCollection services)
    {
        // Singleton so it can be resolved from the (root) application service provider inside
        // the interceptor; it reads the per-request principal via IHttpContextAccessor.
        services.AddSingleton<IAuditActorProvider, AuditActorProvider>();
        return services;
    }

    public static DbContextOptionsBuilder UseAuditing(this DbContextOptionsBuilder options)
    {
        options.AddInterceptors(new AuditSaveChangesInterceptor());
        return options;
    }
}
```

- [ ] **Step 5: Wire production DI**

In `src/backend/LeaveCalendar.Web/Infrastructure/DependencyInjection.cs`, add `using LeaveCalendar.Web.Infrastructure.Auditing;`, change the DbContext registration to attach the interceptor, and register the actor provider. Replace:

```csharp
        builder.AddNpgsqlDbContext<LeaveDbContext>("leavecalendar");
```

with:

```csharp
        builder.AddNpgsqlDbContext<LeaveDbContext>("leavecalendar",
            configureDbContextOptions: options => options.UseAuditing());
        services.AddAuditing();
```

(`AddHttpContextAccessor()` is already called further down, so `AuditActorProvider` can resolve it.)

- [ ] **Step 6: Wire the test harness**

In `src/backend/LeaveCalendar.IntegrationTests/Infrastructure/ApiFactory.cs`:

1. Add `using LeaveCalendar.Web.Infrastructure.Auditing;` at the top.
2. Attach the interceptor to the replacement DbContext registration — change:

```csharp
            services.AddDbContext<LeaveDbContext>(o =>
                o.UseNpgsql(_db.GetConnectionString()));
```

to:

```csharp
            // Match production: the audit interceptor must be present here too, since this
            // replaces the Aspire-registered context (otherwise the suite runs un-audited).
            services.AddDbContext<LeaveDbContext>(o =>
                o.UseNpgsql(_db.GetConnectionString()).UseAuditing());
```

3. Truncate `audit_log` alongside `leave_registrations` on reset — change:

```csharp
        await ctx.Database.ExecuteSqlRawAsync("TRUNCATE TABLE leave_registrations RESTART IDENTITY CASCADE;");
```

to:

```csharp
        await ctx.Database.ExecuteSqlRawAsync("TRUNCATE TABLE leave_registrations, audit_log RESTART IDENTITY CASCADE;");
```

- [ ] **Step 7: Run the Task-3 tests to verify they pass**

Run: `dotnet test src/backend/LeaveCalendar.IntegrationTests --filter "FullyQualifiedName~AuditTrailTests"`
Expected: PASS (3 tests — System Insert, admin Update with before/after, atomic rollback).

- [ ] **Step 8: Run the whole suite (guard against regressions)**

Run: `dotnet test src/backend/LeaveCalendar.sln`
Expected: PASS. (Existing tests that seed via the DbContext now also create `System` audit rows; none assert on `audit_log`, and `ResetAsync` clears it per test, so they stay green.)

- [ ] **Step 9: Commit**

```bash
git add src/backend/LeaveCalendar.Web/Infrastructure/Auditing src/backend/LeaveCalendar.Web/Infrastructure/DependencyInjection.cs src/backend/LeaveCalendar.IntegrationTests/Infrastructure/ApiFactory.cs src/backend/LeaveCalendar.IntegrationTests/Features/AuditTrailTests.cs
git commit -m "feat(audit): capture every leave write in the same transaction"
```

---

### Task 4: Coverage tests for the remaining write paths

Proves the interceptor audits all six write paths, not just admin edit. The mechanism already
works (Task 3); these are coverage tests only — no production code changes expected.

**Files:**
- Modify: `src/backend/LeaveCalendar.IntegrationTests/Features/AuditTrailTests.cs`

**Interfaces:**
- Consumes: everything from Task 3.

- [ ] **Step 1: Add the write-path coverage tests**

Append these methods to the `AuditTrailTests` class (inside the closing brace):

```csharp
    [Fact]
    public async Task AdminCreate_records_an_Insert_attributed_to_the_admin()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.PostAsJsonAsync("/api/admin/leave", new
        {
            EmployeeId = EddieId, LeaveTypeId = Vacation,
            StartDate = "2026-07-01", EndDate = "2026-07-05", Description = (string?)null, Notes = (string?)null
        });
        response.EnsureSuccessStatusCode();

        var insert = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Insert);
        insert.SubjectEmployeeId.Should().Be(EddieId);
        insert.ActorEmployeeId.Should().Be(AdminId);
    }

    [Fact]
    public async Task AdminDelete_records_a_Delete_attributed_to_the_admin()
    {
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));
        var client = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var response = await client.DeleteAsync($"/api/admin/leave/{regId}");
        response.EnsureSuccessStatusCode();

        var delete = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Delete);
        delete.EntityId.Should().Be(regId);
        delete.SubjectEmployeeId.Should().Be(EddieId);
        delete.ActorEmployeeId.Should().Be(AdminId);
    }

    [Fact]
    public async Task SelfRegister_records_an_Insert_where_actor_equals_subject()
    {
        await Factory.ResetAsync();
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PostAsJsonAsync("/api/me/leave", new
        {
            LeaveTypeId = Vacation, StartDate = "2026-07-01", EndDate = "2026-07-05",
            Description = (string?)null, Notes = (string?)null
        });
        response.EnsureSuccessStatusCode();

        var insert = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Insert);
        insert.SubjectEmployeeId.Should().Be(EddieId);
        insert.ActorEmployeeId.Should().Be(EddieId);   // actor == subject for self-service
        insert.ActorRole.Should().Be("Employee");
    }

    [Fact]
    public async Task SelfEdit_records_an_Update_where_actor_equals_subject()
    {
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.PutAsJsonAsync($"/api/me/leave/{regId}",
            new EditRequest(Vacation, "2026-07-02", "2026-07-06"));
        response.EnsureSuccessStatusCode();

        var update = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Update);
        update.EntityId.Should().Be(regId);
        update.ActorEmployeeId.Should().Be(EddieId);
    }

    [Fact]
    public async Task SelfDelete_records_a_Delete_where_actor_equals_subject()
    {
        await Factory.ResetAsync();
        var regId = await SeedRegistrationAsync(EddieId, new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5));
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");

        var response = await client.DeleteAsync($"/api/me/leave/{regId}");
        response.EnsureSuccessStatusCode();

        var delete = (await AuditRowsAsync()).Single(r => r.Action == AuditAction.Delete);
        delete.EntityId.Should().Be(regId);
        delete.ActorEmployeeId.Should().Be(EddieId);
    }
```

> Note: self-service dates must be today-or-future relative to `ApiFactory.FakeToday`
> (`2026-06-15`); the `2026-07-xx` dates above satisfy `EnsureStartTodayOrFuture`. The seeded
> rows used by SelfEdit/SelfDelete are future-dated so `EnsureEditableByEmployee` passes.

- [ ] **Step 2: Run to verify they pass**

Run: `dotnet test src/backend/LeaveCalendar.IntegrationTests --filter "FullyQualifiedName~AuditTrailTests"`
Expected: PASS (8 tests total in the class).

- [ ] **Step 3: Commit**

```bash
git add src/backend/LeaveCalendar.IntegrationTests/Features/AuditTrailTests.cs
git commit -m "test(audit): cover all six leave write paths"
```

---

### Task 5: Admin read endpoint (`GET /api/admin/audit`)

**Files:**
- Create: `src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail/Request.cs`
- Create: `src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail/Response.cs`
- Create: `src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail/Validator.cs`
- Create: `src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail/Handler.cs`
- Create: `src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail/Endpoint.cs`
- Test: `src/backend/LeaveCalendar.IntegrationTests/Features/ViewAuditTrailTests.cs`

**Interfaces:**
- Consumes: `AuditLogEntry`, `AuditAction`, `LeaveDbContext.AuditLog`, `PagedResult<T>`, `ValidationFilter<T>`, `IEndpoint`.
- Produces: `GET /api/admin/audit` returning `PagedResult<AuditEntryDto>` (Admin-only).

- [ ] **Step 1: Write the failing tests**

Create `src/backend/LeaveCalendar.IntegrationTests/Features/ViewAuditTrailTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;
using Xunit;

namespace LeaveCalendar.IntegrationTests.Features;

public class ViewAuditTrailTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private static readonly Guid EddieId  = Guid.Parse("22222222-0000-0000-0000-000000000002");
    private static readonly Guid NoraId   = Guid.Parse("22222222-0000-0000-0000-000000000003");
    private static readonly Guid Vacation = Guid.Parse("11111111-0000-0000-0000-000000000001");

    private record AuditEntryDto(Guid Id, string OccurredAt, string Action, Guid EntityId,
        Guid SubjectEmployeeId, Guid? ActorEmployeeId, string ActorName, string ActorRole,
        System.Text.Json.JsonElement Changes);
    private record Paged(List<AuditEntryDto> Items, int Page, int PageSize, int TotalCount, int TotalPages);

    private async Task SeedAuditViaApiAsync()
    {
        // Two admin-created rows for Eddie + one for Nora → three audit Inserts.
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        async Task Create(Guid emp, string s, string e) =>
            (await admin.PostAsJsonAsync("/api/admin/leave", new
            {
                EmployeeId = emp, LeaveTypeId = Vacation, StartDate = s, EndDate = e,
                Description = (string?)null, Notes = (string?)null
            })).EnsureSuccessStatusCode();

        await Create(EddieId, "2026-07-01", "2026-07-03");
        await Create(EddieId, "2026-07-10", "2026-07-12");
        await Create(NoraId,  "2026-07-01", "2026-07-03");
    }

    [Fact]
    public async Task Get_audit_as_employee_returns_403()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var response = await client.GetAsync("/api/admin/audit");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Get_audit_anonymous_returns_401()
    {
        var client = Factory.CreateClient();
        var response = await client.GetAsync("/api/admin/audit");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Get_audit_returns_all_rows()
    {
        await Factory.ResetAsync();
        await SeedAuditViaApiAsync();
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var body = await (await admin.GetAsync("/api/admin/audit")).Content.ReadFromJsonAsync<Paged>();

        body!.TotalCount.Should().Be(3);
        body.Items.Should().HaveCount(3);
        // NOTE: the handler orders by OccurredAt descending, but ApiFactory's clock is fixed so
        // all rows share one timestamp — ordering can't be asserted meaningfully here. This test
        // verifies the rows are all returned; pagination/filtering are covered by the tests below.
    }

    [Fact]
    public async Task Get_audit_filters_by_subject_employee()
    {
        await Factory.ResetAsync();
        await SeedAuditViaApiAsync();
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var body = await (await admin.GetAsync($"/api/admin/audit?subjectEmployeeId={EddieId}"))
            .Content.ReadFromJsonAsync<Paged>();

        body!.TotalCount.Should().Be(2);
        body.Items.Should().OnlyContain(x => x.SubjectEmployeeId == EddieId);
    }

    [Fact]
    public async Task Get_audit_filters_by_action()
    {
        await Factory.ResetAsync();
        await SeedAuditViaApiAsync();
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var body = await (await admin.GetAsync("/api/admin/audit?action=Insert"))
            .Content.ReadFromJsonAsync<Paged>();

        body!.Items.Should().OnlyContain(x => x.Action == "Insert");
        body.TotalCount.Should().Be(3);
    }

    [Fact]
    public async Task Get_audit_paginates()
    {
        await Factory.ResetAsync();
        await SeedAuditViaApiAsync();
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var body = await (await admin.GetAsync("/api/admin/audit?page=1&pageSize=2"))
            .Content.ReadFromJsonAsync<Paged>();

        body!.Page.Should().Be(1);
        body.PageSize.Should().Be(2);
        body.TotalCount.Should().Be(3);
        body.TotalPages.Should().Be(2);
        body.Items.Should().HaveCount(2);
    }

    [Fact]
    public async Task Get_audit_transposed_range_returns_400()
    {
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await admin.GetAsync("/api/admin/audit?from=2026-07-10&to=2026-07-01");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `dotnet test src/backend/LeaveCalendar.IntegrationTests --filter "FullyQualifiedName~ViewAuditTrailTests"`
Expected: FAIL — route `/api/admin/audit` not found (404s instead of 403/200).

- [ ] **Step 3: Create the request**

`src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail/Request.cs`:

```csharp
using LeaveCalendar.Web.Infrastructure.Auditing;

namespace LeaveCalendar.Web.Features.Admin.ViewAuditTrail;

public sealed record Request
{
    public Guid? SubjectEmployeeId { get; init; }
    public AuditAction? Action { get; init; }
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    public int? Page { get; init; }
    public int? PageSize { get; init; }
}
```

- [ ] **Step 4: Create the response DTO**

`src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail/Response.cs`:

```csharp
using System.Text.Json;

namespace LeaveCalendar.Web.Features.Admin.ViewAuditTrail;

public sealed record AuditEntryDto(
    Guid Id,
    string OccurredAt,
    string Action,
    Guid EntityId,
    Guid SubjectEmployeeId,
    Guid? ActorEmployeeId,
    string ActorName,
    string ActorRole,
    JsonElement Changes);
```

- [ ] **Step 5: Create the validator**

`src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail/Validator.cs`:

```csharp
using FluentValidation;

namespace LeaveCalendar.Web.Features.Admin.ViewAuditTrail;

public sealed class Validator : AbstractValidator<Request>
{
    public Validator()
    {
        // Reject a transposed range (to < from) with a 400 rather than a misleading empty 200.
        RuleFor(x => x.To)
            .GreaterThanOrEqualTo(x => x.From!.Value)
            .When(x => x.From.HasValue && x.To.HasValue)
            .WithMessage("'to' must be greater than or equal to 'from'.");
    }
}
```

- [ ] **Step 6: Create the handler**

`src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail/Handler.cs`:

```csharp
using System.Text.Json;
using LeaveCalendar.Web.Common;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.Web.Features.Admin.ViewAuditTrail;

public static class Handler
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    public static async Task<IResult> HandleAsync(
        [AsParameters] Request request,
        LeaveDbContext db,
        CancellationToken ct)
    {
        var actualPage = (request.Page is null or < 1) ? 1 : request.Page.Value;
        var actualPageSize = (request.PageSize is null or < 1)
            ? DefaultPageSize
            : Math.Min(request.PageSize.Value, MaxPageSize);

        var query = db.AuditLog.AsQueryable();

        if (request.SubjectEmployeeId is { } subject)
            query = query.Where(x => x.SubjectEmployeeId == subject);

        if (request.Action is { } action)
            query = query.Where(x => x.Action == action);

        if (request.From is { } from)
        {
            var fromTs = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            query = query.Where(x => x.OccurredAt >= fromTs);
        }

        if (request.To is { } to)
        {
            // Inclusive upper bound: everything before the start of the next UTC day.
            var toExclusive = new DateTimeOffset(to.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            query = query.Where(x => x.OccurredAt < toExclusive);
        }

        var totalCount = await query.CountAsync(ct);
        var totalPages = (int)Math.Ceiling(totalCount / (double)actualPageSize);
        actualPage = Math.Min(actualPage, Math.Max(totalPages, 1));

        var rows = await query
            .OrderByDescending(x => x.OccurredAt)
            .Skip((actualPage - 1) * actualPageSize)
            .Take(actualPageSize)
            .ToListAsync(ct);

        // Materialize DTOs in memory: format the timestamp and re-embed the jsonb change set as
        // raw JSON (Deserialize<JsonElement> detaches it from any backing document).
        var items = rows.Select(x => new AuditEntryDto(
            x.Id,
            x.OccurredAt.ToString("o"),
            x.Action.ToString(),
            x.EntityId,
            x.SubjectEmployeeId,
            x.ActorEmployeeId,
            x.ActorName,
            x.ActorRole,
            JsonSerializer.Deserialize<JsonElement>(x.Changes))).ToList();

        var result = new PagedResult<AuditEntryDto>(items, actualPage, actualPageSize, totalCount, totalPages);
        return Results.Ok(result);
    }
}
```

- [ ] **Step 7: Create the endpoint**

`src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail/Endpoint.cs`:

```csharp
using LeaveCalendar.Web.Common;

namespace LeaveCalendar.Web.Features.Admin.ViewAuditTrail;

public sealed class Endpoint : IEndpoint
{
    public void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/api/admin/audit", Handler.HandleAsync)
           .RequireAuthorization("Admin")
           .AddEndpointFilter<ValidationFilter<Request>>()
           .WithTags("Admin");
}
```

- [ ] **Step 8: Run the read-endpoint tests to verify they pass**

Run: `dotnet test src/backend/LeaveCalendar.IntegrationTests --filter "FullyQualifiedName~ViewAuditTrailTests"`
Expected: PASS (7 tests).

- [ ] **Step 9: Run the full suite**

Run: `dotnet test src/backend/LeaveCalendar.sln`
Expected: PASS (all projects green).

- [ ] **Step 10: Commit**

```bash
git add src/backend/LeaveCalendar.Web/Features/Admin/ViewAuditTrail src/backend/LeaveCalendar.IntegrationTests/Features/ViewAuditTrailTests.cs
git commit -m "feat(audit): add the admin audit-trail read endpoint"
```

- [ ] **Step 11: Push and open the PR**

```bash
git push -u origin feat/audit-trail
gh pr create --base main \
  --title "feat(audit): leave-registration audit trail" \
  --body "Implements the audit trail from docs/superpowers/specs/2026-06-22-audit-trail-design.md.

Why: closes the arc42 §8.1 gap — every leave write (admin + self-service) now records who/when/before-after, in the same transaction as the change, with an admin-only read endpoint. GDPR data-subject rights (export/erasure/retention) remain a separate Round 2 spec.

What:
- audit_log table (append-only, no FKs) + migration
- hand-rolled SaveChangesInterceptor (same-transaction, System-actor fallback)
- IAuditActorProvider (actor from JWT principal)
- GET /api/admin/audit (Admin-only, paged, filterable)
- integration coverage for all six write paths + atomicity + read endpoint"
```

Then **stop** — per the team rule, the user reviews and merges the PR.

---

## Notes for the implementer

- **The interceptor's same-transaction trick is the load-bearing part.** Adding `AuditLogEntry`
  rows to the context inside `SavingChanges` makes them part of the in-flight `SaveChanges`.
  Task 3's `FailedWrite_rolls_back...` test is the proof; if it ever shows an orphaned audit
  row, the atomicity guarantee is broken — do not paper over it.
- **Why the actor provider is a singleton:** the interceptor resolves it from the *root*
  application service provider, where scoped services can't be resolved. It reads the
  per-request principal through `IHttpContextAccessor` (an `AsyncLocal`), so a singleton is
  correct and thread-safe.
- **Existing tests now generate `System` audit rows** whenever they seed via the DbContext.
  That's expected and harmless (`ResetAsync` truncates `audit_log` each test). If an unrelated
  test ever starts asserting exact `audit_log` counts, scope it by `EntityId`/`Action`.
- **DTO `Changes` is embedded raw JSON**, not a JSON-encoded string — clients get a nested
  object. `JsonSerializer.Deserialize<JsonElement>` is what keeps it from double-encoding.
```
