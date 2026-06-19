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
            ["ConnectionStrings:leavecalendar"] = _db.GetConnectionString(),
            ["Jwt:Issuer"] = TestJwtIssuer,
            ["Jwt:Audience"] = TestJwtAudience,
            ["Jwt:SigningKey"] = TestJwtSigningKey
        }));
        builder.ConfigureServices(services =>
        {
            // Replace the real clock with a fixed fake so date-rule tests are deterministic.
            services.RemoveAll<IClock>();
            services.AddSingleton<IClock>(new FakeClock(FakeToday));

            // Aspire's AddNpgsqlDbContext uses AddDbContextPool and captures IConfiguration
            // at build time, before ConfigureAppConfiguration overrides are applied.
            // Remove every EF/Aspire registration for LeaveDbContext and re-add a plain
            // AddDbContext pointing directly at the Testcontainers connection string.
            // Sweep covers pool/options descriptors registered by AddNpgsqlDbContext
            // (verified against Aspire.Npgsql.EntityFrameworkCore.PostgreSQL 13.4.5),
            // including the non-generic DbContextOptions base some Aspire versions register.
            var leaveDbDescriptors = services
                .Where(d =>
                    d.ServiceType == typeof(LeaveDbContext) ||
                    d.ServiceType == typeof(DbContextOptions<LeaveDbContext>) ||
                    d.ServiceType == typeof(DbContextOptions) ||
                    (d.ServiceType.IsGenericType &&
                     d.ServiceType.GenericTypeArguments.Length > 0 &&
                     d.ServiceType.GenericTypeArguments[0] == typeof(LeaveDbContext)))
                .ToList();
            foreach (var d in leaveDbDescriptors)
                services.Remove(d);
            services.AddDbContext<LeaveDbContext>(o =>
                o.UseNpgsql(_db.GetConnectionString()));
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
