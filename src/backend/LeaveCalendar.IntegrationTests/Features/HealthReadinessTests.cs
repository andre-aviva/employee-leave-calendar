using System.Net;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LeaveCalendar.IntegrationTests.Features;

/// <summary>
/// Issue #27: /health must reflect real database readiness rather than always returning 200.
/// Uses a standalone factory pointed at an unreachable database (no Testcontainer needed).
/// </summary>
public class HealthReadinessTests
{
    private const string UnreachableDb =
        "Host=127.0.0.1;Port=59999;Database=none;Username=none;Password=none;Timeout=2;Command Timeout=2";

    private sealed class DbDownFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("IntegrationTest"); // skip startup migrate+seed
            builder.ConfigureAppConfiguration((_, cfg) => cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:leavecalendar"] = UnreachableDb,
                ["Jwt:Issuer"] = ApiFactory.TestJwtIssuer,
                ["Jwt:Audience"] = ApiFactory.TestJwtAudience,
                ["Jwt:SigningKey"] = ApiFactory.TestJwtSigningKey
            }));
            builder.ConfigureServices(services =>
            {
                // Replace Aspire's build-time DbContext registration with one pointing at an
                // unreachable server (same descriptor sweep as ApiFactory).
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
                services.AddDbContext<LeaveDbContext>(o => o.UseNpgsql(UnreachableDb));
            });
        }
    }

    [Fact]
    public async Task Health_returns_503_when_database_unreachable()
    {
        using var factory = new DbDownFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable,
            because: "readiness must fail when the database cannot be reached");
    }

    [Fact]
    public async Task Alive_returns_200_even_when_database_unreachable()
    {
        using var factory = new DbDownFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/alive");

        response.StatusCode.Should().Be(HttpStatusCode.OK,
            because: "liveness is independent of the database dependency");
    }
}
