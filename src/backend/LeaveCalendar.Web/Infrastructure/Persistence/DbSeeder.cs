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
                new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000002"), Name = "Sick Leave",     ColourHex = "#C62828", RegisterableBy = RegisterableBy.Employee, IsSensitive = true },
                new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000003"), Name = "Public Holiday", ColourHex = "#1565C0", RegisterableBy = RegisterableBy.Admin },
                new LeaveType { Id = Guid.Parse("11111111-0000-0000-0000-000000000004"), Name = "Other",          ColourHex = "#6A1B9A", RegisterableBy = RegisterableBy.Employee });
        }
        if (!await db.Employees.AnyAsync(ct))
        {
            db.Employees.AddRange(
                new Employee { Id = Guid.Parse("22222222-0000-0000-0000-000000000001"), Name = "Alice Admin",    Username = "admin",    Role = Role.Admin,    PasswordHash = hasher.Hash("Admin!123") },
                new Employee { Id = Guid.Parse("22222222-0000-0000-0000-000000000002"), Name = "Eddie Employee", Username = "employee", Role = Role.Employee, PasswordHash = hasher.Hash("Employee!123") },
                new Employee { Id = Guid.Parse("22222222-0000-0000-0000-000000000003"), Name = "Nora Newbie",    Username = "nora",     Role = Role.Employee, PasswordHash = hasher.Hash("Employee!123") });
        }
        await db.SaveChangesAsync(ct);
    }
}
