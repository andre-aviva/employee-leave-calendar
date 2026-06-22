using System.Security.Claims;
using FluentAssertions;
using LeaveCalendar.Web.Infrastructure.Auditing;
using LeaveCalendar.Web.Infrastructure.Jwt;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace LeaveCalendar.IntegrationTests.Features;

public class AuditActorProviderTests
{
    private static AuditActorProvider ProviderFor(HttpContext? context) =>
        new(new HttpContextAccessor { HttpContext = context });

    [Fact]
    public void GetCurrent_noHttpContext_returns_System()
    {
        var actor = ProviderFor(null).GetCurrent();

        actor.Should().Be(AuditActor.System);
        actor.EmployeeId.Should().BeNull();
        actor.Name.Should().Be("System");
        actor.Role.Should().Be("System");
    }

    [Fact]
    public void GetCurrent_unauthenticated_returns_System()
    {
        var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) };

        ProviderFor(ctx).GetCurrent().Should().Be(AuditActor.System);
    }

    [Fact]
    public void GetCurrent_authenticated_returns_actor_from_claims()
    {
        var id = Guid.Parse("22222222-0000-0000-0000-000000000001");
        var identity = new ClaimsIdentity(
        [
            new Claim(JwtClaimNames.Subject, id.ToString()),
            new Claim(JwtClaimNames.Name, "Alice Admin"),
            new Claim(JwtClaimNames.Role, "Admin")
        ], authenticationType: "Test");
        var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };

        var actor = ProviderFor(ctx).GetCurrent();

        actor.EmployeeId.Should().Be(id);
        actor.Name.Should().Be("Alice Admin");
        actor.Role.Should().Be("Admin");
    }

    [Fact]
    public void GetCurrent_authenticated_but_nonGuid_sub_returns_System()
    {
        var identity = new ClaimsIdentity(
            [new Claim(JwtClaimNames.Subject, "not-a-guid")], authenticationType: "Test");
        var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };

        ProviderFor(ctx).GetCurrent().Should().Be(AuditActor.System);
    }

    [Fact]
    public void GetCurrent_authenticated_but_missing_name_or_role_returns_System()
    {
        var identity = new ClaimsIdentity(
            [new Claim(JwtClaimNames.Subject, Guid.NewGuid().ToString())], // sub only, no name/role
            authenticationType: "Test");
        var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };

        ProviderFor(ctx).GetCurrent().Should().Be(AuditActor.System);
    }
}
