using Xunit;
namespace LeaveCalendar.IntegrationTests.Infrastructure;
[CollectionDefinition("api")]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>;

[Collection("api")]
public abstract class IntegrationTestBase(ApiFactory factory)
{
    protected ApiFactory Factory { get; } = factory;
    protected HttpClient Client { get; } = factory.CreateClient();
}
