using LeaveCalendar.Domain.LeaveTypes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
namespace LeaveCalendar.Web.Infrastructure.Persistence.Configurations;
public sealed class LeaveTypeConfiguration : IEntityTypeConfiguration<LeaveType>
{
    public void Configure(EntityTypeBuilder<LeaveType> t)
    {
        // The DB independently rejects out-of-range RegisterableBy values (defence in depth, as
        // with employees.Role). Values are the RegisterableBy enum names stored by
        // HasConversion<string>(); the column is quoted because EF maps it PascalCase.
        t.ToTable("leave_types", tb =>
            tb.HasCheckConstraint("CK_leave_types_registerable_by", "\"RegisterableBy\" IN ('Employee', 'Admin')"));
        t.HasKey(x => x.Id);
        t.Property(x => x.Name).IsRequired().HasMaxLength(100);
        t.Property(x => x.ColourHex).IsRequired().HasMaxLength(7);
        t.Property(x => x.RegisterableBy).HasConversion<string>().HasMaxLength(20);
        t.Property(x => x.IsSensitive).IsRequired().HasDefaultValue(false);
        t.HasIndex(x => x.Name).IsUnique();
        t.HasIndex(x => x.ColourHex).IsUnique();
    }
}
