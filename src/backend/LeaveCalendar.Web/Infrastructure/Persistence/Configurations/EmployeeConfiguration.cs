using LeaveCalendar.Domain.Employees;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
namespace LeaveCalendar.Web.Infrastructure.Persistence.Configurations;
public sealed class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> e)
    {
        // The DB independently rejects out-of-range Role values (defence in depth: reads already
        // reject unknowns via Enum.TryParse, but a write outside the app/a future bug could not
        // otherwise). Values are the Role enum names stored by HasConversion<string>(); the column
        // is quoted because EF maps it PascalCase (only table names are snake_case here).
        e.ToTable("employees", t =>
            t.HasCheckConstraint("CK_employees_role", "\"Role\" IN ('Employee', 'Admin')"));
        e.HasKey(x => x.Id);
        e.Property(x => x.Name).IsRequired().HasMaxLength(200);
        e.Property(x => x.Username).IsRequired().HasMaxLength(100);
        e.Property(x => x.PasswordHash).IsRequired();
        e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
        e.HasIndex(x => x.Username).IsUnique();
    }
}
