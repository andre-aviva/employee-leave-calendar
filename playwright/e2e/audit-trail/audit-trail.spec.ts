import { test, expect } from '../../support/fixtures';
import {
  EMPLOYEE_ALICE_ADMIN,
  EMPLOYEE_EDDIE_EMPLOYEE,
  EMPLOYEE_NORA_NEWBIE,
} from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION, LEAVE_TYPE_SICK_LEAVE } from '../../support/testdata/leaveTypes';
import {
  apiSignIn,
  apiCreateMyLeave,
  apiDeleteMyLeave,
  apiAdminCreateLeave,
  apiAdminDeleteLeave,
  apiAdminEditLeave,
  apiEditMyLeave,
  apiGetAuditTrail,
  type AuditEntry,
} from '../../support/helpers/api';
import { isoDate } from '../../support/helpers/dates';

// audit_log is append-only; tests look up entries by entityId so prior history is invisible.
// Count-based tests capture a baseline before seeding and assert the expected delta.

test.describe('Audit Trail (/api/admin/audit)', () => {
  let adminToken: string;
  let eddieToken: string;

  test.beforeAll(async ({ request }) => {
    [adminToken, eddieToken] = await Promise.all([
      apiSignIn(request, EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password),
      apiSignIn(request, EMPLOYEE_EDDIE_EMPLOYEE.username, EMPLOYEE_EDDIE_EMPLOYEE.password),
    ]);
  });

  test.describe('access control', () => {
    test('unauthenticated request returns 401', async ({ request }) => {
      const res = await request.get('/api/admin/audit');
      expect(res.status()).toBe(401);
    });

    test('employee-role request returns 403', async ({ request }) => {
      const res = await request.get('/api/admin/audit', {
        headers: { Authorization: `Bearer ${eddieToken}` },
      });
      expect(res.status()).toBe(403);
    });

    test('admin request returns 200 with paged response shape', async ({ request }) => {
      const res = await request.get('/api/admin/audit', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Object.keys(body).sort()).toEqual(
        ['items', 'page', 'pageSize', 'totalCount', 'totalPages'].sort(),
      );
      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.page).toBe('number');
      expect(typeof body.totalCount).toBe('number');
    });
  });

  test.describe('write path coverage', () => {
    test('admin create → Insert entry with admin as actor and Eddie as subject', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(entry!.action).toBe('Insert');
      expect(entry!.subjectEmployeeId).toBe(EMPLOYEE_EDDIE_EMPLOYEE.id);
      expect(entry!.actorEmployeeId).toBe(EMPLOYEE_ALICE_ADMIN.id);
      expect(entry!.actorName).toBe(EMPLOYEE_ALICE_ADMIN.name);
      expect(entry!.actorRole).toBe('Admin');
      expect(entry!.actorEmployeeId).not.toBe(entry!.subjectEmployeeId);
      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });

    test('admin edit → Update entry recording modified fields', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });
      await apiAdminEditLeave(request, adminToken, leaveId, {
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(10),
        endDate: isoDate(12),
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Update',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(entry!.actorEmployeeId).toBe(EMPLOYEE_ALICE_ADMIN.id);
      expect(entry!.actorRole).toBe('Admin');
      expect(entry!.changes).toHaveProperty('LeaveTypeId');
      expect(entry!.changes).toHaveProperty('StartDate');
      expect(entry!.changes).toHaveProperty('EndDate');
      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });

    test('admin delete → Delete entry attributed to the admin', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });
      await apiAdminDeleteLeave(request, adminToken, leaveId);
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Delete',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(entry!.actorEmployeeId).toBe(EMPLOYEE_ALICE_ADMIN.id);
      expect(entry!.actorRole).toBe('Admin');
    });

    test('employee self-register → Insert entry where actor equals subject', async ({ request }) => {
      const leaveId = await apiCreateMyLeave(request, eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(entry!.actorEmployeeId).toBe(EMPLOYEE_EDDIE_EMPLOYEE.id);
      expect(entry!.actorRole).toBe('Employee');
      expect(entry!.actorEmployeeId).toBe(entry!.subjectEmployeeId);
      await apiDeleteMyLeave(request, eddieToken, leaveId);
    });

    test('employee self-edit → Update entry where actor equals subject', async ({ request }) => {
      const leaveId = await apiCreateMyLeave(request, eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      await apiEditMyLeave(request, eddieToken, leaveId, {
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(8),
        endDate: isoDate(10),
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Update',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(entry!.actorEmployeeId).toBe(EMPLOYEE_EDDIE_EMPLOYEE.id);
      expect(entry!.actorRole).toBe('Employee');
      await apiDeleteMyLeave(request, eddieToken, leaveId);
    });

    test('employee self-delete → Delete entry where actor equals subject', async ({ request }) => {
      const leaveId = await apiCreateMyLeave(request, eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      });
      await apiDeleteMyLeave(request, eddieToken, leaveId);
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Delete',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(entry!.actorEmployeeId).toBe(EMPLOYEE_EDDIE_EMPLOYEE.id);
      expect(entry!.actorRole).toBe('Employee');
    });
  });

  test.describe('Changes field structure', () => {
    test('Insert — Changes contains the full column set of the created registration', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(Object.keys(entry!.changes).sort()).toEqual(
        ['Description', 'EmployeeId', 'EndDate', 'Id', 'LeaveTypeId', 'Notes', 'StartDate'],
      );
      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });

    test('Update — Changes contains only modified fields, each with { old, new } shape', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });
      await apiAdminEditLeave(request, adminToken, leaveId, {
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Update',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      const typeChange = entry!.changes['LeaveTypeId'] as { old: string; new: string };
      expect(typeChange).toHaveProperty('old');
      expect(typeChange).toHaveProperty('new');
      expect(typeChange.old).toBe(LEAVE_TYPE_VACATION.id);
      expect(typeChange.new).toBe(LEAVE_TYPE_SICK_LEAVE.id);
      expect(entry!.changes).not.toHaveProperty('StartDate');
      expect(entry!.changes).not.toHaveProperty('EndDate');
      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });

    test('Delete — Changes contains the full original column set', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });
      await apiAdminDeleteLeave(request, adminToken, leaveId);
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Delete',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(Object.keys(entry!.changes).sort()).toEqual(
        ['Description', 'EmployeeId', 'EndDate', 'Id', 'LeaveTypeId', 'Notes', 'StartDate'],
      );
    });

    test('Description is kept verbatim — not redacted', async ({ request }) => {
      const description = 'Annual holiday booking';
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
        description,
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(entry!.changes['Description']).toBe(description);
      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });
  });

  test.describe('Notes masking (D9 — GDPR)', () => {
    test('non-null Notes is stored as "[redacted]"', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(3),
        endDate: isoDate(4),
        notes: 'Chronic illness appointment — confidential',
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(entry!.changes['Notes']).toBe('[redacted]');
      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });

    test('null Notes stays null', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(6),
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      expect(entry!.changes['Notes']).toBeNull();
      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });

    test('when Notes changes in an Update, both old and new values are masked', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(3),
        endDate: isoDate(4),
        notes: 'Original sensitive note',
      });
      await apiAdminEditLeave(request, adminToken, leaveId, {
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(3),
        endDate: isoDate(4),
        notes: 'Updated sensitive note',
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Update',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      const notesChange = entry!.changes['Notes'] as { old: unknown; new: unknown };
      expect(notesChange.old).toBe('[redacted]');
      expect(notesChange.new).toBe('[redacted]');
      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });
  });

  test.describe('filter by subjectEmployeeId', () => {
    test('returns only entries for the specified employee', async ({ request }) => {
      const before = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const noraBaseline = before.totalCount;

      const [noraId1, noraId2, eddieId] = await Promise.all([
        apiAdminCreateLeave(request, adminToken, { employeeId: EMPLOYEE_NORA_NEWBIE.id, leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(3), endDate: isoDate(4) }),
        apiAdminCreateLeave(request, adminToken, { employeeId: EMPLOYEE_NORA_NEWBIE.id, leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(6), endDate: isoDate(7) }),
        apiAdminCreateLeave(request, adminToken, { employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id, leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(3), endDate: isoDate(4) }),
      ]);

      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      expect(result.totalCount).toBe(noraBaseline + 2);
      result.items.forEach((item: AuditEntry) => {
        expect(item.subjectEmployeeId).toBe(EMPLOYEE_NORA_NEWBIE.id);
      });

      await Promise.all([
        apiAdminDeleteLeave(request, adminToken, noraId1),
        apiAdminDeleteLeave(request, adminToken, noraId2),
        apiAdminDeleteLeave(request, adminToken, eddieId),
      ]);
    });
  });

  test.describe('filter by action', () => {
    test('action=Insert excludes Update and Delete entries for the same entity', async ({ request }) => {
      const before = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const insertBaseline = before.totalCount;

      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });
      await apiAdminEditLeave(request, adminToken, leaveId, {
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });

      const insertResult = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      expect(insertResult.totalCount).toBe(insertBaseline + 1);
      insertResult.items.forEach((item: AuditEntry) => { expect(item.action).toBe('Insert'); });

      const updateResult = await apiGetAuditTrail(request, adminToken, {
        action: 'Update',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const updateEntry = updateResult.items.find((x) => x.entityId === leaveId);
      expect(updateEntry).toBeDefined();
      expect(updateEntry!.action).toBe('Update');

      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });
  });

  test.describe('filter by date range', () => {
    test('entry created today appears when from=yesterday and to=today', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        from: isoDate(-1),
        to: isoDate(0),
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeDefined();
      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });

    test('entry created today is excluded when the range lies entirely in the past', async ({ request }) => {
      const leaveId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        from: isoDate(-10),
        to: isoDate(-5),
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const entry = result.items.find((x) => x.entityId === leaveId);
      expect(entry).toBeUndefined();
      await apiAdminDeleteLeave(request, adminToken, leaveId);
    });

    test('transposed range (to < from) returns 400', async ({ request }) => {
      const res = await request.get('/api/admin/audit', {
        headers: { Authorization: `Bearer ${adminToken}` },
        params: { from: isoDate(5), to: isoDate(1) },
      });
      expect(res.status()).toBe(400);
    });
  });

  test.describe('pagination', () => {
    test('pageSize=2 returns 2 items on page 1; page 2 is accessible; metadata is correct', async ({ request }) => {
      const before = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const noraInsertBaseline = before.totalCount;

      const [id1, id2, id3] = await Promise.all([
        apiAdminCreateLeave(request, adminToken, { employeeId: EMPLOYEE_NORA_NEWBIE.id, leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(3), endDate: isoDate(4) }),
        apiAdminCreateLeave(request, adminToken, { employeeId: EMPLOYEE_NORA_NEWBIE.id, leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(6), endDate: isoDate(7) }),
        apiAdminCreateLeave(request, adminToken, { employeeId: EMPLOYEE_NORA_NEWBIE.id, leaveTypeId: LEAVE_TYPE_VACATION.id, startDate: isoDate(9), endDate: isoDate(10) }),
      ]);

      const page1 = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        page: 1,
        pageSize: 2,
      });
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(2);
      expect(page1.items).toHaveLength(2);
      expect(page1.totalCount).toBe(noraInsertBaseline + 3);
      expect(page1.totalPages).toBe(Math.ceil((noraInsertBaseline + 3) / 2));

      const page2 = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        page: 2,
        pageSize: 2,
      });
      expect(page2.page).toBe(2);
      expect(page2.items.length).toBeGreaterThanOrEqual(1);

      await Promise.all([
        apiAdminDeleteLeave(request, adminToken, id1),
        apiAdminDeleteLeave(request, adminToken, id2),
        apiAdminDeleteLeave(request, adminToken, id3),
      ]);
    });
  });

  test.describe('result ordering', () => {
    test('the entry created second appears before the entry created first (newest-first)', async ({ request }) => {
      const earlierId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(4),
      });
      const laterId = await apiAdminCreateLeave(request, adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(6),
        endDate: isoDate(7),
      });
      const result = await apiGetAuditTrail(request, adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      });
      const earlierIdx = result.items.findIndex((x) => x.entityId === earlierId);
      const laterIdx = result.items.findIndex((x) => x.entityId === laterId);
      expect(earlierIdx).toBeGreaterThanOrEqual(0);
      expect(laterIdx).toBeGreaterThanOrEqual(0);
      expect(laterIdx).toBeLessThan(earlierIdx);
      await Promise.all([
        apiAdminDeleteLeave(request, adminToken, earlierId),
        apiAdminDeleteLeave(request, adminToken, laterId),
      ]);
    });

    test('all items on the page are in non-ascending OccurredAt order', async ({ request }) => {
      const result = await apiGetAuditTrail(request, adminToken, { pageSize: 20 });
      if (result.items.length < 2) return;
      const timestamps = result.items.map((x) => new Date(x.occurredAt).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });
  });
});
