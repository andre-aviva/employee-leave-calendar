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
