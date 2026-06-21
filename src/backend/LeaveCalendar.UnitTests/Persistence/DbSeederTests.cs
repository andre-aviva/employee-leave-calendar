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
}
