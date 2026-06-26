var builder = DistributedApplication.CreateBuilder(args);

// Dev ports are pinned so every run uses the same URLs. The Aspire dashboard
// (AppHost launchSettings) and the api project (Web launchSettings: 7237/5283)
// are already fixed; postgres, pgweb and the Vite app would otherwise each grab
// a random host port on every run, so they're pinned below.
var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()                               // persistent volume so seeded data survives restarts
    .WithHostPort(15432)                            // fixed Postgres host port (15432 avoids clashing with a local 5432)
    .WithPgWeb(pgWeb => pgWeb.WithHostPort(15080)); // browse the DB from the dashboard on a fixed port

var leavecalendar = postgres.AddDatabase("leavecalendar");

var api = builder.AddProject<Projects.LeaveCalendar_Web>("api")
    .WithReference(leavecalendar)
    .WaitFor(leavecalendar)
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health");

builder.AddViteApp("web", "../../frontend")
    .WithReference(api)              // injects services__api__http(s)__0 into the Vite process
    .WaitFor(api)
    .WithNpmPackageInstallation()   // runs `npm install` if node_modules is missing
    .WithExternalHttpEndpoints()
    .WithEndpoint("http", endpoint =>   // AddViteApp's "http" endpoint defaults to a random port; pin it
    {
        endpoint.Port = 5173;           // browser-facing port -> stable http://localhost:5173
        endpoint.TargetPort = 5173;     // port Vite binds via `--port`; keep in sync with vite.config.ts
        endpoint.IsProxied = false;     // expose Vite's listener directly so HMR connects cleanly
    });

builder.Build().Run();
