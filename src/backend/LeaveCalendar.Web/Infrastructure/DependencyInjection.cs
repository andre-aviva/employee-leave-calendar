using FluentValidation;
using LeaveCalendar.Web.Common;
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using LeaveCalendar.Web.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Infrastructure;
public static class DependencyInjection
{
    public static WebApplicationBuilder AddLeaveCalendar(this WebApplicationBuilder builder)
    {
        var services = builder.Services;
        services.AddDbContext<LeaveDbContext>(o =>
            o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddHttpContextAccessor();
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddEndpoints(typeof(DependencyInjection).Assembly);
        services.AddProblemDetails();
        services.AddExceptionHandler<DomainExceptionHandler>();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        services.AddCors(o => o.AddPolicy("Spa", p => p
            .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
            .AllowAnyHeader().AllowAnyMethod()));
        return builder;
    }
}
