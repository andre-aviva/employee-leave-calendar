using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeaveCalendar.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveOverlapExclusionConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Enforce the "no overlapping leave for the same employee" invariant at the
            // database, concurrency-safe (a check-then-act race in application code could
            // otherwise let two concurrent writes both commit overlapping rows).
            //
            // btree_gist lets a GiST exclusion constraint combine the equality operator on
            // EmployeeId with the range-overlap operator (&&) on the leave period. The
            // inclusive daterange '[]' matches LeavePeriod.Overlaps (Start <= End on both
            // sides), so adjacency at a shared endpoint counts as an overlap on both layers.
            // Columns are quoted because EF maps them PascalCase (only table names are
            // snake_case in this schema).
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");
            migrationBuilder.Sql(
                """
                ALTER TABLE leave_registrations
                ADD CONSTRAINT "EX_leave_registrations_no_overlap"
                EXCLUDE USING gist (
                    "EmployeeId" WITH =,
                    daterange("StartDate", "EndDate", '[]') WITH &&
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """ALTER TABLE leave_registrations DROP CONSTRAINT IF EXISTS "EX_leave_registrations_no_overlap";""");
            // The btree_gist extension is left in place: dropping it could affect other
            // objects and it is harmless to keep.
        }
    }
}
