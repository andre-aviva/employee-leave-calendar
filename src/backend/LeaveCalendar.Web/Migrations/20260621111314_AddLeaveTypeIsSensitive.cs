using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeaveCalendar.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveTypeIsSensitive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSensitive",
                table: "leave_types",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSensitive",
                table: "leave_types");
        }
    }
}
