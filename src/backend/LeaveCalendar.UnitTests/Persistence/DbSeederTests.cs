using FluentAssertions;
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeaveCalendar.UnitTests.Persistence;

public class DbSeederTests
{
    private static LeaveDbContext NewContext() =>
        new(new DbContextOptionsBuilder<LeaveDbContext>()
            .UseInMemoryDatabase($"seeder-{Guid.NewGuid()}")
            .Options);

    [Fact]
    public async Task SeedAsync_withoutDemoUsers_seeds_reference_data_but_no_users()
    {
        await using var db = NewContext();

        await DbSeeder.SeedAsync(db, new BCryptPasswordHasher(), includeDemoUsers: false);

        // Reference data still seeds (production needs leave types)...
        (await db.LeaveTypes.CountAsync()).Should().Be(4);
        // ...but no demo users / default admin in a non-Development boot.
        (await db.Employees.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task SeedAsync_withDemoUsers_seeds_the_demo_users()
    {
        await using var db = NewContext();

        await DbSeeder.SeedAsync(db, new BCryptPasswordHasher(), includeDemoUsers: true);

        (await db.Employees.CountAsync()).Should().Be(3);
        (await db.LeaveTypes.CountAsync()).Should().Be(4);
    }

    [Fact]
    public async Task SeedAsync_is_idempotent_across_repeated_runs()
    {
        await using var db = NewContext();
        var hasher = new BCryptPasswordHasher();

        await DbSeeder.SeedAsync(db, hasher, includeDemoUsers: true);
        await DbSeeder.SeedAsync(db, hasher, includeDemoUsers: true);

        // Insert-if-missing: a second run adds nothing, no duplicates.
        (await db.LeaveTypes.CountAsync()).Should().Be(4);
        (await db.Employees.CountAsync()).Should().Be(3);
    }

    [Fact]
    public async Task SeedAsync_repairs_a_partially_seeded_set()
    {
        await using var db = NewContext();
        var hasher = new BCryptPasswordHasher();

        await DbSeeder.SeedAsync(db, hasher, includeDemoUsers: true);

        // Simulate a half-seeded state: drop two leave types and one employee.
        db.LeaveTypes.RemoveRange(await db.LeaveTypes.OrderBy(lt => lt.Name).Take(2).ToListAsync());
        db.Employees.RemoveRange(await db.Employees.OrderBy(e => e.Name).Take(1).ToListAsync());
        await db.SaveChangesAsync();
        (await db.LeaveTypes.CountAsync()).Should().Be(2);
        (await db.Employees.CountAsync()).Should().Be(2);

        // Re-running converges back to the full intended set — the old Any() guard could not,
        // because it skips a set that is present-but-incomplete.
        await DbSeeder.SeedAsync(db, hasher, includeDemoUsers: true);

        (await db.LeaveTypes.CountAsync()).Should().Be(4);
        (await db.Employees.CountAsync()).Should().Be(3);
    }
}
