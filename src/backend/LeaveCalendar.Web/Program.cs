using LeaveCalendar.Web.Common;
using LeaveCalendar.Web.Infrastructure;
using LeaveCalendar.Web.Infrastructure.Identity;
using LeaveCalendar.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration).Enrich.FromLogContext());
builder.AddLeaveCalendar();

var app = builder.Build();

app.UseExceptionHandler();
app.UseSerilogRequestLogging();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("Spa");
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" })).AllowAnonymous();
app.MapEndpoints();

// migrate + seed on startup (skipped under the integration-test environment, which does it in the harness)
if (!app.Environment.IsEnvironment("IntegrationTest"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<LeaveDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher>());
}

app.Run();

public partial class Program; // exposed for WebApplicationFactory<Program>
