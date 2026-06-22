using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeaveCalendar.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_log",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Action = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectEmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ActorRole = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Changes = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_log", x => x.Id);
                    table.CheckConstraint("CK_audit_log_Action", "\"Action\" IN ('Insert', 'Update', 'Delete')");
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_log_SubjectEmployeeId_OccurredAt",
                table: "audit_log",
                columns: new[] { "SubjectEmployeeId", "OccurredAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_log");
        }
    }
}
