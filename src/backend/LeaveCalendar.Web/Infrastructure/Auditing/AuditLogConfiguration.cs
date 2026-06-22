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
