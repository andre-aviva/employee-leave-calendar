using System.IdentityModel.Tokens.Jwt;
using System.Text;
using FluentValidation;
using LeaveCalendar.Web.Common;
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Jwt;
using LeaveCalendar.Web.Infrastructure.Persistence;
using LeaveCalendar.Web.Infrastructure.Time;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace LeaveCalendar.Web.Infrastructure;

public static class DependencyInjection
{
    public static WebApplicationBuilder AddLeaveCalendar(this WebApplicationBuilder builder)
    {
        JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

        var services = builder.Services;
        services.AddDbContext<LeaveDbContext>(o =>
            o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
        services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
        services.AddSingleton<IJwtTokenIssuer, JwtTokenIssuer>();
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

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((bearerOptions, jwtOpts) =>
            {
                var jwt = jwtOpts.Value;
                bearerOptions.MapInboundClaims = false;
                bearerOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                    NameClaimType = Microsoft.IdentityModel.JsonWebTokens.JwtRegisteredClaimNames.Sub,
                    RoleClaimType = "role"
                };
            });
        services.AddAuthorizationBuilder()
            .AddPolicy("Admin", p => p.RequireRole("Admin"));
        services.AddScoped<ICurrentUser, CurrentUser>();

        return builder;
    }
}
