using LeaveCalendar.Domain.Employees;
using LeaveCalendar.Domain.Leave;
using LeaveCalendar.Domain.LeaveTypes;
using Microsoft.EntityFrameworkCore;
namespace LeaveCalendar.Web.Infrastructure.Persistence;
public sealed class LeaveDbContext(DbContextOptions<LeaveDbContext> options) : DbContext(options)
{
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
    public DbSet<LeaveRegistration> LeaveRegistrations => Set<LeaveRegistration>();
    protected override void OnModelCreating(ModelBuilder b) => b.ApplyConfigurationsFromAssembly(typeof(LeaveDbContext).Assembly);
}
