using System.Security.Claims;
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
using Microsoft.OpenApi;

namespace LeaveCalendar.Web.Infrastructure;

public static class DependencyInjection
{
    public static WebApplicationBuilder AddLeaveCalendar(this WebApplicationBuilder builder)
    {
        var services = builder.Services;
        builder.AddNpgsqlDbContext<LeaveDbContext>("leavecalendar");
        services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

        // ── JWT fail-fast guard ───────────────────────────────────────────────
        // Validation runs before the first request is served (OptionsValidationHostedService),
        // which means it fires after WebApplicationFactory's ConfigureWebHost overrides
        // have been applied — the integration harness passes, production with no key throws.
        services.AddOptions<JwtOptions>()
            .Validate(o =>
                !string.IsNullOrEmpty(o.SigningKey) && Encoding.UTF8.GetByteCount(o.SigningKey) >= 32,
                "Jwt:SigningKey must be supplied via configuration/secrets and its UTF-8 encoding must be at least 32 bytes (256 bits) for HS256.")
            .Validate(o => !string.IsNullOrEmpty(o.Issuer),
                "Jwt:Issuer must be supplied via configuration/secrets.")
            .Validate(o => !string.IsNullOrEmpty(o.Audience),
                "Jwt:Audience must be supplied via configuration/secrets.")
            .ValidateOnStart();
        // ─────────────────────────────────────────────────────────────────────

        services.AddSingleton<IJwtTokenIssuer, JwtTokenIssuer>();
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddHttpContextAccessor();
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddEndpoints(typeof(DependencyInjection).Assembly);
        services.AddProblemDetails();
        services.AddExceptionHandler<DomainExceptionHandler>();
        // Readiness: /health now fails when the database is unreachable, not just liveness.
        // Adds to the "self" liveness check registered by ServiceDefaults.AddDefaultHealthChecks().
        services.AddHealthChecks().AddDbContextCheck<LeaveDbContext>("database");
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            // Vertical slices reuse short type names (Request/Response) across feature folders,
            // which collide under Swashbuckle's default short-name schemaId and 500 the whole
            // document. Qualify each schema with its slice — the namespace segment after
            // "…Features." — e.g. "AdminEditLeaveRequest". Slice folder names are unique.
            options.CustomSchemaIds(type =>
            {
                var slice = type.Namespace?.Split('.').LastOrDefault();
                return slice is null ? type.Name : slice + type.Name;
            });

            // Almost every endpoint is RequireAuthorization, so expose a Bearer scheme plus a
            // global requirement: this gives the Swagger UI an "Authorize" button and lets it
            // attach a pasted JWT (from POST /api/auth/sign-in) to protected calls.
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Paste a JWT from POST /api/auth/sign-in (without the \"Bearer \" prefix)."
            });
            options.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
            {
                { new OpenApiSecuritySchemeReference("Bearer", doc), new List<string>() }
            });
        });
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
                    // Identity vs display split (see JwtClaimNames): "sub" carries identity and is
                    // read explicitly via CurrentUser.EmployeeId, while "name" is the display value
                    // bound to ClaimsIdentity.Name here so the two never diverge.
                    NameClaimType = JwtClaimNames.Name,
                    RoleClaimType = JwtClaimNames.Role,
                    // Issuer and validator share one clock; no skew tolerance — expired tokens
                    // are rejected promptly (the framework default is 5 minutes).
                    ClockSkew = TimeSpan.Zero
                };
                // Re-validate the token's subject against the database on every request so a
                // deleted or role-changed account loses access immediately, rather than staying
                // valid until the token expires.
                bearerOptions.Events = new JwtBearerEvents
                {
                    OnTokenValidated = RevalidateAgainstDatabaseAsync
                };
            });
        services.AddAuthorizationBuilder()
            .AddPolicy("Admin", p => p.RequireRole("Admin"));
        services.AddScoped<ICurrentUser, CurrentUser>();

        return builder;
    }

    // Authorization identity and role come from the JWT, but an issued token stays valid
    // until expiry. Re-check the subject against the current Employee record on every request
    // so a deleted account (row gone) or a role change (claim no longer matches the DB) takes
    // effect immediately. Any failure calls context.Fail(), yielding 401.
    private static async Task RevalidateAgainstDatabaseAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        if (!Guid.TryParse(principal?.FindFirstValue(JwtClaimNames.Subject), out var employeeId))
        {
            context.Fail("Token is missing a valid 'sub' claim.");
            return;
        }

        var db = context.HttpContext.RequestServices.GetRequiredService<LeaveDbContext>();
        var current = await db.Employees
            .Where(e => e.Id == employeeId)
            .Select(e => new { e.Role })
            .FirstOrDefaultAsync(context.HttpContext.RequestAborted);

        if (current is null)
        {
            context.Fail("The account no longer exists.");
            return;
        }

        if (!string.Equals(principal!.FindFirstValue(JwtClaimNames.Role), current.Role.ToString(), StringComparison.Ordinal))
            context.Fail("The account role has changed; re-authentication required.");
    }
}
