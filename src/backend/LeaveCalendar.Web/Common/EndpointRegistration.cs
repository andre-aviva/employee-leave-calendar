using System.Reflection;
namespace LeaveCalendar.Web.Common;
public static class EndpointRegistration
{
    /// <summary>
    /// Registers every <see cref="IEndpoint"/> in the assembly. Endpoints are <b>transient</b>
    /// and exist only to register routes at startup (see <see cref="MapEndpoints"/>); they must
    /// stay stateless. Keep request-time dependencies and state in the handler delegates, never
    /// on the endpoint instance. Transient (over singleton) ensures a future endpoint that takes
    /// a scoped constructor dependency cannot capture it as a root singleton.
    /// </summary>
    public static IServiceCollection AddEndpoints(this IServiceCollection services, Assembly assembly)
    {
        foreach (var type in assembly.GetTypes()
                     .Where(t => t is { IsAbstract: false, IsInterface: false } && typeof(IEndpoint).IsAssignableFrom(t)))
            services.AddTransient(typeof(IEndpoint), type);
        return services;
    }

    /// <summary>
    /// Instantiates each endpoint once inside a temporary scope and lets it register its routes.
    /// Resolving within a scope — rather than from the root provider — means an endpoint may
    /// safely take a scoped constructor dependency without tripping container scope validation.
    /// The scope is disposed once mapping completes; the route handlers themselves get a fresh
    /// per-request scope at invocation time.
    /// </summary>
    public static WebApplication MapEndpoints(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        foreach (var endpoint in scope.ServiceProvider.GetRequiredService<IEnumerable<IEndpoint>>())
            endpoint.Map(app);
        return app;
    }
}
