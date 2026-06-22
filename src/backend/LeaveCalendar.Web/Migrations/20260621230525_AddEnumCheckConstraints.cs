using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeaveCalendar.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddEnumCheckConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_leave_types_registerable_by",
                table: "leave_types",
                sql: "\"RegisterableBy\" IN ('Employee', 'Admin')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_employees_role",
                table: "employees",
                sql: "\"Role\" IN ('Employee', 'Admin')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_leave_types_registerable_by",
                table: "leave_types");

            migrationBuilder.DropCheckConstraint(
                name: "CK_employees_role",
                table: "employees");
        }
    }
}
