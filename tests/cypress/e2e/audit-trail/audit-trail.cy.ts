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
import {
  EMPLOYEE_ALICE_ADMIN,
  EMPLOYEE_EDDIE_EMPLOYEE,
  EMPLOYEE_NORA_NEWBIE,
} from '../../support/testdata/employees';
import { LEAVE_TYPE_VACATION, LEAVE_TYPE_SICK_LEAVE } from '../../support/testdata/leaveTypes';
import { isoDate } from '../../support/helpers/dates';

// Audit trail notes on test isolation:
// - The audit_log table is append-only (no delete/truncate from the API).
// - Each test seeds its own leave and looks up the resulting audit entry by entityId so
//   pre-existing entries from earlier runs do not affect assertions.
// - Count-based tests (filter, pagination) capture a baseline count before seeding and
//   assert the expected delta, keeping them immune to accumulated history.
// - Cleanup (leave deletion) runs at the end of each test via cy.then() to keep dates
//   free for subsequent tests, even though the audit entries themselves remain.

describe('Audit Trail (/api/admin/audit)', () => {
  let adminToken: string;
  let eddieToken: string;

  before(() => {
    apiSignIn(EMPLOYEE_ALICE_ADMIN.username, EMPLOYEE_ALICE_ADMIN.password).then((t) => {
      adminToken = t;
    });
    apiSignIn(EMPLOYEE_EDDIE_EMPLOYEE.username, EMPLOYEE_EDDIE_EMPLOYEE.password).then((t) => {
      eddieToken = t;
    });
  });

  // ── Access control ────────────────────────────────────────────────────────────

  describe('access control', () => {
    it('unauthenticated request returns 401', () => {
      cy.request({ method: 'GET', url: '/api/admin/audit', failOnStatusCode: false })
        .its('status')
        .should('equal', 401);
    });

    it('employee-role request returns 403', () => {
      cy.request({
        method: 'GET',
        url: '/api/admin/audit',
        headers: { Authorization: `Bearer ${eddieToken}` },
        failOnStatusCode: false,
      })
        .its('status')
        .should('equal', 403);
    });

    it('admin request returns 200 with paged response shape', () => {
      cy.request({
        method: 'GET',
        url: '/api/admin/audit',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.have.all.keys(
          'items',
          'page',
          'pageSize',
          'totalCount',
          'totalPages',
        );
        expect(response.body.items).to.be.an('array');
        expect(response.body.page).to.be.a('number');
        expect(response.body.totalCount).to.be.a('number');
      });
    });
  });

  // ── Write path coverage ───────────────────────────────────────────────────────

  describe('write path coverage — all six leave-mutation paths generate an audit entry', () => {
    // Admin paths: actorEmployeeId (Alice) ≠ subjectEmployeeId (Eddie)
    // Self-service paths: actorEmployeeId == subjectEmployeeId (Eddie)

    it('admin create → Insert entry with admin as actor and Eddie as subject', () => {
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      }).then((id) => {
        leaveId = id;
      });

      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, `Insert entry for leave ${leaveId}`).to.not.be.undefined;
        expect(entry!.action).to.equal('Insert');
        expect(entry!.subjectEmployeeId).to.equal(EMPLOYEE_EDDIE_EMPLOYEE.id);
        expect(entry!.actorEmployeeId).to.equal(EMPLOYEE_ALICE_ADMIN.id);
        expect(entry!.actorName).to.equal(EMPLOYEE_ALICE_ADMIN.name);
        expect(entry!.actorRole).to.equal('Admin');
        // actor is Alice, subject is Eddie — they differ
        expect(entry!.actorEmployeeId).to.not.equal(entry!.subjectEmployeeId);
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });

    it('admin edit → Update entry recording modified fields; admin as actor, Eddie as subject', () => {
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      }).then((id) => {
        leaveId = id;
      });

      cy.then(() =>
        apiAdminEditLeave(adminToken, leaveId, {
          leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
          startDate: isoDate(10),
          endDate: isoDate(12),
        }),
      );

      apiGetAuditTrail(adminToken, {
        action: 'Update',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, `Update entry for leave ${leaveId}`).to.not.be.undefined;
        expect(entry!.actorEmployeeId).to.equal(EMPLOYEE_ALICE_ADMIN.id);
        expect(entry!.actorName).to.equal(EMPLOYEE_ALICE_ADMIN.name);
        expect(entry!.actorRole).to.equal('Admin');
        expect(entry!.subjectEmployeeId).to.equal(EMPLOYEE_EDDIE_EMPLOYEE.id);
        expect(entry!.actorEmployeeId).to.not.equal(entry!.subjectEmployeeId);
        // All three changed columns must appear in the change set
        expect(entry!.changes).to.have.property('LeaveTypeId');
        expect(entry!.changes).to.have.property('StartDate');
        expect(entry!.changes).to.have.property('EndDate');
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });

    it('admin delete → Delete entry attributed to the admin', () => {
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      }).then((id) => {
        leaveId = id;
      });

      // Delete creates the Delete audit entry; no cleanup needed afterward
      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));

      apiGetAuditTrail(adminToken, {
        action: 'Delete',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, `Delete entry for leave ${leaveId}`).to.not.be.undefined;
        expect(entry!.actorEmployeeId).to.equal(EMPLOYEE_ALICE_ADMIN.id);
        expect(entry!.actorRole).to.equal('Admin');
        expect(entry!.subjectEmployeeId).to.equal(EMPLOYEE_EDDIE_EMPLOYEE.id);
        expect(entry!.actorEmployeeId).to.not.equal(entry!.subjectEmployeeId);
      });
    });

    it('employee self-register → Insert entry where actor equals subject (both are Eddie)', () => {
      let leaveId: string;

      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      }).then((id) => {
        leaveId = id;
      });

      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, `Insert entry for self-registered leave ${leaveId}`).to.not.be.undefined;
        expect(entry!.actorEmployeeId).to.equal(EMPLOYEE_EDDIE_EMPLOYEE.id);
        expect(entry!.actorRole).to.equal('Employee');
        // self-service: actor == subject
        expect(entry!.actorEmployeeId).to.equal(entry!.subjectEmployeeId);
      });

      cy.then(() => apiDeleteMyLeave(eddieToken, leaveId));
    });

    it('employee self-edit → Update entry where actor equals subject', () => {
      let leaveId: string;

      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      }).then((id) => {
        leaveId = id;
      });

      cy.then(() =>
        apiEditMyLeave(eddieToken, leaveId, {
          leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
          startDate: isoDate(8),
          endDate: isoDate(10),
        }),
      );

      apiGetAuditTrail(adminToken, {
        action: 'Update',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, `Update entry for self-edited leave ${leaveId}`).to.not.be.undefined;
        expect(entry!.actorEmployeeId).to.equal(EMPLOYEE_EDDIE_EMPLOYEE.id);
        expect(entry!.actorRole).to.equal('Employee');
        expect(entry!.actorEmployeeId).to.equal(entry!.subjectEmployeeId);
      });

      cy.then(() => apiDeleteMyLeave(eddieToken, leaveId));
    });

    it('employee self-delete → Delete entry where actor equals subject', () => {
      let leaveId: string;

      apiCreateMyLeave(eddieToken, {
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(7),
        endDate: isoDate(9),
      }).then((id) => {
        leaveId = id;
      });

      cy.then(() => apiDeleteMyLeave(eddieToken, leaveId));

      apiGetAuditTrail(adminToken, {
        action: 'Delete',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, `Delete entry for self-deleted leave ${leaveId}`).to.not.be.undefined;
        expect(entry!.actorEmployeeId).to.equal(EMPLOYEE_EDDIE_EMPLOYEE.id);
        expect(entry!.actorRole).to.equal('Employee');
        expect(entry!.actorEmployeeId).to.equal(entry!.subjectEmployeeId);
      });
    });
  });

  // ── Changes field structure ───────────────────────────────────────────────────

  describe('Changes field structure', () => {
    it('Insert — Changes contains the full column set of the created registration', () => {
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      }).then((id) => {
        leaveId = id;
      });

      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, 'Insert entry exists').to.not.be.undefined;
        expect(entry!.changes).to.have.all.keys(
          'Id',
          'EmployeeId',
          'LeaveTypeId',
          'StartDate',
          'EndDate',
          'Description',
          'Notes',
        );
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });

    it('Update — Changes contains only modified fields, each with { old, new } shape', () => {
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      }).then((id) => {
        leaveId = id;
      });

      // Only LeaveTypeId changes; StartDate and EndDate stay the same
      cy.then(() =>
        apiAdminEditLeave(adminToken, leaveId, {
          leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
          startDate: isoDate(3),
          endDate: isoDate(5),
        }),
      );

      apiGetAuditTrail(adminToken, {
        action: 'Update',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, 'Update entry exists').to.not.be.undefined;
        // Changed field has old/new sub-keys
        const typeChange = entry!.changes['LeaveTypeId'] as { old: string; new: string };
        expect(typeChange).to.have.property('old');
        expect(typeChange).to.have.property('new');
        expect(typeChange.old).to.equal(LEAVE_TYPE_VACATION.id);
        expect(typeChange.new).to.equal(LEAVE_TYPE_SICK_LEAVE.id);
        // Unchanged fields must be absent from the Update change set
        expect(entry!.changes).to.not.have.property('StartDate');
        expect(entry!.changes).to.not.have.property('EndDate');
        expect(entry!.changes).to.not.have.property('EmployeeId');
        expect(entry!.changes).to.not.have.property('Id');
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });

    it('Delete — Changes contains the full original column set', () => {
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      }).then((id) => {
        leaveId = id;
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));

      apiGetAuditTrail(adminToken, {
        action: 'Delete',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, 'Delete entry exists').to.not.be.undefined;
        expect(entry!.changes).to.have.all.keys(
          'Id',
          'EmployeeId',
          'LeaveTypeId',
          'StartDate',
          'EndDate',
          'Description',
          'Notes',
        );
      });
    });

    it('Description is kept verbatim — it is not a redacted field', () => {
      const description = 'Annual holiday booking';
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
        description,
      }).then((id) => {
        leaveId = id;
      });

      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, 'Insert entry exists').to.not.be.undefined;
        expect(entry!.changes['Description']).to.equal(description);
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });
  });

  // ── Notes masking (D9 — GDPR) ────────────────────────────────────────────────

  describe('Notes masking (D9 — GDPR)', () => {
    // Notes may contain sensitive personal data (e.g. a sick-leave reason). The interceptor
    // replaces every non-null Notes value with "[redacted]" so sensitive text never lands
    // in the append-only, FK-free audit_log table. A null Notes stays null.

    it('non-null Notes is stored as "[redacted]" — the actual text is never persisted', () => {
      const sensitiveNotes = 'Chronic illness appointment — confidential';
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(3),
        endDate: isoDate(4),
        notes: sensitiveNotes,
      }).then((id) => {
        leaveId = id;
      });

      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, 'Insert entry exists').to.not.be.undefined;
        expect(entry!.changes['Notes']).to.equal('[redacted]');
        expect(entry!.changes['Notes']).to.not.equal(sensitiveNotes);
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });

    it('null Notes stays null — the redacted marker is not applied to absent values', () => {
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(5),
        endDate: isoDate(6),
        // notes omitted → null
      }).then((id) => {
        leaveId = id;
      });

      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, 'Insert entry exists').to.not.be.undefined;
        expect(entry!.changes).to.have.property('Notes');
        expect(entry!.changes['Notes']).to.be.null;
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });

    it('when Notes changes in an Update, both old and new values are masked', () => {
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
        startDate: isoDate(3),
        endDate: isoDate(4),
        notes: 'Original sensitive note',
      }).then((id) => {
        leaveId = id;
      });

      cy.then(() =>
        apiAdminEditLeave(adminToken, leaveId, {
          leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
          startDate: isoDate(3),
          endDate: isoDate(4),
          notes: 'Updated sensitive note',
        }),
      );

      apiGetAuditTrail(adminToken, {
        action: 'Update',
        subjectEmployeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, 'Update entry exists').to.not.be.undefined;
        expect(entry!.changes).to.have.property('Notes');
        const notesChange = entry!.changes['Notes'] as { old: unknown; new: unknown };
        expect(notesChange.old).to.equal('[redacted]');
        expect(notesChange.new).to.equal('[redacted]');
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });
  });

  // ── Filter by subjectEmployeeId ───────────────────────────────────────────────

  describe('filter by subjectEmployeeId', () => {
    it('returns only entries for the specified employee; other employees are excluded', () => {
      let noraBaseline = 0;
      let noraId1: string;
      let noraId2: string;
      let eddieId: string;

      // Capture baseline before seeding
      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((before) => {
        noraBaseline = before.totalCount;
      });

      // Seed 2 Nora + 1 Eddie Insert
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(4),
      }).then((id) => {
        noraId1 = id;
      });
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(6),
        endDate: isoDate(7),
      }).then((id) => {
        noraId2 = id;
      });
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_EDDIE_EMPLOYEE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(4),
      }).then((id) => {
        eddieId = id;
      });

      // Assert: exactly 2 new Nora Inserts; Eddie's is excluded
      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((result) => {
        expect(result.totalCount).to.equal(noraBaseline + 2);
        result.items.forEach((item: AuditEntry) => {
          expect(item.subjectEmployeeId).to.equal(EMPLOYEE_NORA_NEWBIE.id);
        });
      });

      cy.then(() => {
        apiAdminDeleteLeave(adminToken, noraId1);
        apiAdminDeleteLeave(adminToken, noraId2);
        apiAdminDeleteLeave(adminToken, eddieId);
      });
    });
  });

  // ── Filter by action ──────────────────────────────────────────────────────────

  describe('filter by action', () => {
    it('action=Insert excludes Update and Delete entries for the same entity', () => {
      let leaveId: string;
      let insertBaseline = 0;

      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((before) => {
        insertBaseline = before.totalCount;
      });

      // Create → Edit (produces one Insert + one Update for the same entity)
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      }).then((id) => {
        leaveId = id;
      });

      cy.then(() =>
        apiAdminEditLeave(adminToken, leaveId, {
          leaveTypeId: LEAVE_TYPE_SICK_LEAVE.id,
          startDate: isoDate(3),
          endDate: isoDate(5),
        }),
      );

      // action=Insert → count increases by exactly 1; all returned items are Inserts
      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((result) => {
        expect(result.totalCount).to.equal(insertBaseline + 1);
        result.items.forEach((item: AuditEntry) => {
          expect(item.action).to.equal('Insert');
        });
      });

      // action=Update → the Update for our entity is present
      apiGetAuditTrail(adminToken, {
        action: 'Update',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((result) => {
        const updateEntry = result.items.find((x) => x.entityId === leaveId);
        expect(updateEntry, 'Update entry for the edited leave').to.not.be.undefined;
        expect(updateEntry!.action).to.equal('Update');
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });
  });

  // ── Filter by date range ──────────────────────────────────────────────────────

  describe('filter by date range', () => {
    it('entry created today appears when from=yesterday and to=today', () => {
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      }).then((id) => {
        leaveId = id;
      });

      apiGetAuditTrail(adminToken, {
        from: isoDate(-1),
        to: isoDate(0),
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, "today's Insert must appear in a [yesterday, today] date range").to.not.be
          .undefined;
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });

    it('entry created today is excluded when the range lies entirely in the past', () => {
      let leaveId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(5),
      }).then((id) => {
        leaveId = id;
      });

      apiGetAuditTrail(adminToken, {
        from: isoDate(-10),
        to: isoDate(-5),
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((result) => {
        const entry = result.items.find((x) => x.entityId === leaveId);
        expect(entry, "today's Insert must NOT appear in a past-only date range").to.be.undefined;
      });

      cy.then(() => apiAdminDeleteLeave(adminToken, leaveId));
    });

    it('transposed range (to < from) returns 400', () => {
      cy.request({
        method: 'GET',
        url: '/api/admin/audit',
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { from: isoDate(5), to: isoDate(1) },
        failOnStatusCode: false,
      })
        .its('status')
        .should('equal', 400);
    });
  });

  // ── Pagination ────────────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('pageSize=2 returns 2 items on page 1; page 2 is accessible; metadata is correct', () => {
      let noraInsertBaseline = 0;
      let id1: string, id2: string, id3: string;

      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((before) => {
        noraInsertBaseline = before.totalCount;
      });

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(4),
      }).then((id) => {
        id1 = id;
      });
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(6),
        endDate: isoDate(7),
      }).then((id) => {
        id2 = id;
      });
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(9),
        endDate: isoDate(10),
      }).then((id) => {
        id3 = id;
      });

      // Page 1: exactly 2 items; metadata reflects total
      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        page: 1,
        pageSize: 2,
      }).then((result) => {
        expect(result.page).to.equal(1);
        expect(result.pageSize).to.equal(2);
        expect(result.items).to.have.length(2);
        expect(result.totalCount).to.equal(noraInsertBaseline + 3);
        expect(result.totalPages).to.equal(Math.ceil((noraInsertBaseline + 3) / 2));
      });

      // Page 2: has the remaining items
      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        page: 2,
        pageSize: 2,
      }).then((result) => {
        expect(result.page).to.equal(2);
        expect(result.items.length).to.be.gte(1);
      });

      cy.then(() => {
        apiAdminDeleteLeave(adminToken, id1);
        apiAdminDeleteLeave(adminToken, id2);
        apiAdminDeleteLeave(adminToken, id3);
      });
    });
  });

  // ── Result ordering ───────────────────────────────────────────────────────────

  describe('result ordering', () => {
    it('the entry created second appears before the entry created first (newest-first)', () => {
      let earlierId: string;
      let laterId: string;

      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(3),
        endDate: isoDate(4),
      }).then((id) => {
        earlierId = id;
      });

      // Sequential HTTP requests guarantee a later OccurredAt for the second create
      apiAdminCreateLeave(adminToken, {
        employeeId: EMPLOYEE_NORA_NEWBIE.id,
        leaveTypeId: LEAVE_TYPE_VACATION.id,
        startDate: isoDate(6),
        endDate: isoDate(7),
      }).then((id) => {
        laterId = id;
      });

      apiGetAuditTrail(adminToken, {
        action: 'Insert',
        subjectEmployeeId: EMPLOYEE_NORA_NEWBIE.id,
        pageSize: 100,
      }).then((result) => {
        const earlierIdx = result.items.findIndex((x) => x.entityId === earlierId);
        const laterIdx = result.items.findIndex((x) => x.entityId === laterId);
        expect(earlierIdx, 'earlier entry must be in the result set').to.be.gte(0);
        expect(laterIdx, 'later entry must be in the result set').to.be.gte(0);
        // Newest first: the later entry has a smaller index (closer to position 0)
        expect(laterIdx).to.be.lessThan(earlierIdx);
      });

      cy.then(() => {
        apiAdminDeleteLeave(adminToken, earlierId);
        apiAdminDeleteLeave(adminToken, laterId);
      });
    });

    it('all items on the page are in non-ascending OccurredAt order', () => {
      apiGetAuditTrail(adminToken, { pageSize: 20 }).then((result) => {
        if (result.items.length < 2) return;
        const timestamps = result.items.map((x) => new Date(x.occurredAt).getTime());
        for (let i = 0; i < timestamps.length - 1; i++) {
          expect(timestamps[i], `item[${i}] must be >= item[${i + 1}]`).to.be.gte(
            timestamps[i + 1],
          );
        }
      });
    });
  });
});
