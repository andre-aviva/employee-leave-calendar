using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LeaveCalendar.IntegrationTests.Features;

public class AuditLogSchemaTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task AuditLog_table_exists_and_is_queryable()
    {
        await Factory.ResetAsync();
        using var scope = Factory.Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();

        var count = await ctx.AuditLog.CountAsync();

        count.Should().Be(0);
    }
}
