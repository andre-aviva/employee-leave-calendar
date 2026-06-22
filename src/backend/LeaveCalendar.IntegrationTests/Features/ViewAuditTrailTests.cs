using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LeaveCalendar.IntegrationTests.Infrastructure;
using Xunit;

namespace LeaveCalendar.IntegrationTests.Features;

public class ViewAuditTrailTests(ApiFactory factory) : IntegrationTestBase(factory)
{
    private static readonly Guid EddieId  = Guid.Parse("22222222-0000-0000-0000-000000000002");
    private static readonly Guid NoraId   = Guid.Parse("22222222-0000-0000-0000-000000000003");
    private static readonly Guid Vacation = Guid.Parse("11111111-0000-0000-0000-000000000001");

    private record AuditEntryDto(Guid Id, string OccurredAt, string Action, Guid EntityId,
        Guid SubjectEmployeeId, Guid? ActorEmployeeId, string ActorName, string ActorRole,
        System.Text.Json.JsonElement Changes);
    private record Paged(List<AuditEntryDto> Items, int Page, int PageSize, int TotalCount, int TotalPages);

    private async Task SeedAuditViaApiAsync()
    {
        // Two admin-created rows for Eddie + one for Nora → three audit Inserts.
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        async Task Create(Guid emp, string s, string e) =>
            (await admin.PostAsJsonAsync("/api/admin/leave", new
            {
                EmployeeId = emp, LeaveTypeId = Vacation, StartDate = s, EndDate = e,
                Description = (string?)null, Notes = (string?)null
            })).EnsureSuccessStatusCode();

        await Create(EddieId, "2026-07-01", "2026-07-03");
        await Create(EddieId, "2026-07-10", "2026-07-12");
        await Create(NoraId,  "2026-07-01", "2026-07-03");
    }

    [Fact]
    public async Task Get_audit_as_employee_returns_403()
    {
        var client = await Factory.AuthenticatedClientAsync("employee", "Employee!123");
        var response = await client.GetAsync("/api/admin/audit");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Get_audit_anonymous_returns_401()
    {
        var client = Factory.CreateClient();
        var response = await client.GetAsync("/api/admin/audit");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Get_audit_returns_all_rows()
    {
        await Factory.ResetAsync();
        await SeedAuditViaApiAsync();
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var body = await (await admin.GetAsync("/api/admin/audit")).Content.ReadFromJsonAsync<Paged>();

        body!.TotalCount.Should().Be(3);
        body.Items.Should().HaveCount(3);
        // NOTE: the handler orders by OccurredAt descending, but ApiFactory's clock is fixed so
        // all rows share one timestamp — ordering can't be asserted meaningfully here. This test
        // verifies the rows are all returned; pagination/filtering are covered by the tests below.
    }

    [Fact]
    public async Task Get_audit_filters_by_subject_employee()
    {
        await Factory.ResetAsync();
        await SeedAuditViaApiAsync();
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var body = await (await admin.GetAsync($"/api/admin/audit?subjectEmployeeId={EddieId}"))
            .Content.ReadFromJsonAsync<Paged>();

        body!.TotalCount.Should().Be(2);
        body.Items.Should().OnlyContain(x => x.SubjectEmployeeId == EddieId);
    }

    [Fact]
    public async Task Get_audit_filters_by_action()
    {
        await Factory.ResetAsync();
        await SeedAuditViaApiAsync();
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var body = await (await admin.GetAsync("/api/admin/audit?action=Insert"))
            .Content.ReadFromJsonAsync<Paged>();

        body!.Items.Should().OnlyContain(x => x.Action == "Insert");
        body.TotalCount.Should().Be(3);
    }

    [Fact]
    public async Task Get_audit_paginates()
    {
        await Factory.ResetAsync();
        await SeedAuditViaApiAsync();
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");

        var body = await (await admin.GetAsync("/api/admin/audit?page=1&pageSize=2"))
            .Content.ReadFromJsonAsync<Paged>();

        body!.Page.Should().Be(1);
        body.PageSize.Should().Be(2);
        body.TotalCount.Should().Be(3);
        body.TotalPages.Should().Be(2);
        body.Items.Should().HaveCount(2);
    }

    [Fact]
    public async Task Get_audit_transposed_range_returns_400()
    {
        var admin = await Factory.AuthenticatedClientAsync("admin", "Admin!123");
        var response = await admin.GetAsync("/api/admin/audit?from=2026-07-10&to=2026-07-01");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
