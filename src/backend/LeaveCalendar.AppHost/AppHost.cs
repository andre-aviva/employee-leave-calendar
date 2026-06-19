var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()   // persistent volume so seeded data survives restarts
    .WithPgWeb();       // browse the DB from the dashboard

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
    .WithExternalHttpEndpoints();

builder.Build().Run();
