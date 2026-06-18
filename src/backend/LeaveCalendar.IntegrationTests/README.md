# LeaveCalendar.IntegrationTests

Endpoint tests against a real PostgreSQL instance per test run via Testcontainers. xUnit + FluentAssertions. Covers auth and authorisation (401/403), the write-slice rules end to end, and the stable 422 codes (OVERLAP, TYPE_NOT_REGISTERABLE, START_DATE_IN_PAST).
