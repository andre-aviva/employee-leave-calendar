using FluentAssertions;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace LeaveCalendar.IntegrationTests.Features;

/// <summary>
/// Proves the no-overlap invariant is enforced at the database (issue #21), independently
/// of the handlers' in-memory pre-check — the concurrency-safe backstop.
/// </summary>
public class LeaveOverlapConstraintTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private static readonly Guid EmployeeId = Guid.Parse("22222222-0000-0000-0000-000000000002"); // Eddie
    private static readonly Guid VacationTypeId = Guid.Parse("11111111-0000-0000-0000-000000000001");

    private LeaveRegistration Reg(DateOnly start, DateOnly end) => new()
    {
        Id = Guid.NewGuid(),
        EmployeeId = EmployeeId,
        LeaveTypeId = VacationTypeId,
        StartDate = start,
        EndDate = end
    };

    private async Task InsertAsync(LeaveRegistration reg)
    {
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        ctx.LeaveRegistrations.Add(reg);
        await ctx.SaveChangesAsync();
    }

    [Fact]
    public async Task DbConstraint_rejectsOverlappingInsert_outsideHandlerPath()
    {
        await Factory.ResetAsync();
        await InsertAsync(Reg(new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 10)));

        // A second, overlapping row for the same employee — written directly, bypassing the
        // handler's in-memory pre-check — must be rejected by the exclusion constraint.
        var act = () => InsertAsync(Reg(new DateOnly(2026, 7, 5), new DateOnly(2026, 7, 15)));

        var thrown = await act.Should().ThrowAsync<DbUpdateException>();
        thrown.Which.InnerException.Should().BeOfType<PostgresException>()
              .Which.SqlState.Should().Be(PostgresErrorCodes.ExclusionViolation); // 23P01 -> mapped to 422 OVERLAP
    }

    [Fact]
    public async Task DbConstraint_rejectsAdjacentInsert_sharedEndpointCountsAsOverlap()
    {
        await Factory.ResetAsync();
        await InsertAsync(Reg(new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 10)));

        // Start == existing End is an inclusive overlap (matches LeavePeriod.Overlaps).
        var act = () => InsertAsync(Reg(new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 20)));

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task DbConstraint_allowsNonOverlappingInsert_forSameEmployee()
    {
        await Factory.ResetAsync();
        await InsertAsync(Reg(new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 10)));

        // Non-touching ranges for the same employee are fine — the constraint isn't over-broad.
        var act = () => InsertAsync(Reg(new DateOnly(2026, 7, 11), new DateOnly(2026, 7, 20)));

        await act.Should().NotThrowAsync();
    }
}
