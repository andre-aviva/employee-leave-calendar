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
