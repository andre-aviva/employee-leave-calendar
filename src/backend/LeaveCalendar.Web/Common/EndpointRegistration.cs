using System.Reflection;
namespace LeaveCalendar.Web.Common;
public static class EndpointRegistration
{
    public static IServiceCollection AddEndpoints(this IServiceCollection services, Assembly assembly)
    {
        foreach (var type in assembly.GetTypes()
                     .Where(t => t is { IsAbstract: false, IsInterface: false } && typeof(IEndpoint).IsAssignableFrom(t)))
            services.AddSingleton(typeof(IEndpoint), type);
        return services;
    }

    public static IApplicationBuilder MapEndpoints(this WebApplication app)
    {
        foreach (var endpoint in app.Services.GetRequiredService<IEnumerable<IEndpoint>>())
            endpoint.Map(app);
        return app;
    }
}
