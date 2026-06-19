var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()   // persistent volume so seeded data survives restarts
    .WithPgWeb();       // browse the DB from the dashboard

var leavecalendar = postgres.AddDatabase("leavecalendar");

builder.AddProject<Projects.LeaveCalendar_Web>("api")
    .WithReference(leavecalendar)
    .WaitFor(leavecalendar)
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health");

builder.Build().Run();
