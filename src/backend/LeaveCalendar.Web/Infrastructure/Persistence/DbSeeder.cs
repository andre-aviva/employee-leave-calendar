using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Domain.LeaveTypes;
using LeaveCalendar.Web.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Infrastructure.Persistence;
public static class DbSeeder
{
    // Reference data (LeaveTypes) is seeded in every environment. Demo users — including the
    // well-known "admin" / "Admin!123" account — are seeded ONLY when includeDemoUsers is true,
    // i.e. Development and the integration-test harness. A production deployment must never ship
    // the demo admin; provision the initial admin out of band (see README → "Production admin
    // provisioning"), e.g. an idempotent ops step that creates it from a secret with a forced
    // password change on first login.
    // Seed rows have fixed Ids and are applied insert-if-missing, so re-running converges to the
    // intended state from ANY partial state — a missing row is always re-added. (A per-set
    // Any() guard can't do this: it skips a set that is present-but-incomplete.) Every staged
    // insert commits in the single trailing SaveChangesAsync, which is atomic on a relational
    // provider, so the seed is all-or-nothing — a crash can never leave a half-seeded state.
    public static async Task SeedAsync(LeaveDbContext db, IPasswordHasher hasher, bool includeDemoUsers, CancellationToken ct = default)
    {
        var leaveTypes = new[]
        {
            new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000001"), Name = "Vacation",       ColourHex = "#2E7D32", RegisterableBy = RegisterableBy.Employee },
            new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000002"), Name = "Sick Leave",     ColourHex = "#C62828", RegisterableBy = RegisterableBy.Employee, IsSensitive = true },
            new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000003"), Name = "Public Holiday", ColourHex = "#1565C0", RegisterableBy = RegisterableBy.Admin },
            new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000004"), Name = "Other",          ColourHex = "#6A1B9A", RegisterableBy = RegisterableBy.Employee },
        };
        var existingLeaveTypeIds = await db.LeaveTypes.Select(lt => lt.Id).ToHashSetAsync(ct);
        db.LeaveTypes.AddRange(leaveTypes.Where(lt => !existingLeaveTypeIds.Contains(lt.Id)));

        if (includeDemoUsers)
        {
            var employees = new[]
            {
                new Employee { Id = Guid.Parse("22222222-0000-0000-0000-000000000001"), Name = "Alice Admin",    Username = "admin",    Role = Role.Admin,    PasswordHash = hasher.Hash("Admin!123") },
                new Employee { Id = Guid.Parse("22222222-0000-0000-0000-000000000002"), Name = "Eddie Employee", Username = "employee", Role = Role.Employee, PasswordHash = hasher.Hash("Employee!123") },
                new Employee { Id = Guid.Parse("22222222-0000-0000-0000-000000000003"), Name = "Nora Newbie",    Username = "nora",     Role = Role.Employee, PasswordHash = hasher.Hash("Employee!123") },
            };
            var existingEmployeeIds = await db.Employees.Select(e => e.Id).ToHashSetAsync(ct);
            db.Employees.AddRange(employees.Where(e => !existingEmployeeIds.Contains(e.Id)));
        }

        await db.SaveChangesAsync(ct);
    }
}
