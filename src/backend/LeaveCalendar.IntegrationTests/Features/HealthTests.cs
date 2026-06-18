using System.Net;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;
using Xunit;
namespace LeaveCalendar.IntegrationTests.Features;
public class HealthTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task Health_returns_200()
    {
        var response = await Client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
