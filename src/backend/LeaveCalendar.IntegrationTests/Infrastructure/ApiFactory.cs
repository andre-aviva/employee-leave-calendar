using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using LeaveCalendar.Web.Infrastructure.Time;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Testcontainers.PostgreSql;
using Xunit;
namespace LeaveCalendar.IntegrationTests.Infrastructure;

public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    /// <summary>Fixed "today" used across all date-rule integration tests.</summary>
    public static readonly DateOnly FakeToday = new(2026, 6, 15);

    public const string TestJwtSigningKey = "test-signing-key-at-least-32-bytes-long!!";
    public const string TestJwtIssuer = "leave-calendar-tests";
    public const string TestJwtAudience = "leave-calendar-tests";

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder("postgres:16-alpine").Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("IntegrationTest");
        builder.ConfigureAppConfiguration((_, cfg) => cfg.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = _db.GetConnectionString(),
            ["Jwt:Issuer"] = TestJwtIssuer,
            ["Jwt:Audience"] = TestJwtAudience,
            ["Jwt:SigningKey"] = TestJwtSigningKey
        }));
        builder.ConfigureServices(services =>
        {
            // Replace the real clock with a fixed fake so date-rule tests are deterministic.
            services.RemoveAll<IClock>();
            services.AddSingleton<IClock>(new FakeClock(FakeToday));
        });
    }

    public async Task InitializeAsync()
    {
        await _db.StartAsync();
        using var scope = Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        await ctx.Database.MigrateAsync();
        await DbSeeder.SeedAsync(ctx, scope.ServiceProvider.GetRequiredService<IPasswordHasher>());
    }

    public async Task ResetAsync()
    {
        using var scope = Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
        await ctx.Database.ExecuteSqlRawAsync("TRUNCATE TABLE leave_registrations RESTART IDENTITY CASCADE;");
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
    }
}
