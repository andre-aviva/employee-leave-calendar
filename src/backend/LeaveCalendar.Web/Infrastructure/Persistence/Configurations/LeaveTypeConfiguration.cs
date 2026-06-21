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
        t.Property(x => x.IsSensitive).IsRequired().HasDefaultValue(false);
        t.HasIndex(x => x.Name).IsUnique();
        t.HasIndex(x => x.ColourHex).IsUnique();
    }
}
