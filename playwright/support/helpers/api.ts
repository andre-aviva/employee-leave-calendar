import type { APIRequestContext } from '@playwright/test';

interface ApiItem { id: string; }
interface PagedResult { items: ApiItem[]; }

export interface AuditEntry {
  id: string;
  occurredAt: string;
  action: 'Insert' | 'Update' | 'Delete';
  entityId: string;
  subjectEmployeeId: string;
  actorEmployeeId: string | null;
  actorName: string;
  actorRole: string;
  changes: Record<string, unknown>;
}

export interface AuditTrailPage {
  items: AuditEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface RegisterBody {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  description?: string;
  notes?: string;
}

export interface AdminCreateBody {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  description?: string;
  notes?: string;
}

export async function apiSignIn(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const res = await request.post('/api/auth/sign-in', { data: { username, password } });
  return (await res.json()).token;
}

export async function apiCreateMyLeave(
  request: APIRequestContext,
  token: string,
  body: RegisterBody,
): Promise<string> {
  const res = await request.post('/api/me/leave', {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  });
  return (await res.json()).id;
}

export async function apiDeleteMyLeave(
  request: APIRequestContext,
  token: string,
  id: string,
): Promise<void> {
  await request.delete(`/api/me/leave/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiCleanupMyLeave(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const res = await request.get('/api/me/leave', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const items: ApiItem[] = await res.json();
  await Promise.all(items.map(({ id }) => apiDeleteMyLeave(request, token, id)));
}

export async function apiAdminCreateLeave(
  request: APIRequestContext,
  token: string,
  body: AdminCreateBody,
): Promise<string> {
  const res = await request.post('/api/admin/leave', {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  });
  return (await res.json()).id;
}

export async function apiAdminDeleteLeave(
  request: APIRequestContext,
  token: string,
  id: string,
): Promise<void> {
  await request.delete(`/api/admin/leave/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiAdminEditLeave(
  request: APIRequestContext,
  token: string,
  id: string,
  body: RegisterBody,
): Promise<void> {
  await request.put(`/api/admin/leave/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  });
}

export async function apiEditMyLeave(
  request: APIRequestContext,
  token: string,
  id: string,
  body: RegisterBody,
): Promise<void> {
  await request.put(`/api/me/leave/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: body,
  });
}

export async function apiGetAuditTrail(
  request: APIRequestContext,
  token: string,
  qs?: Record<string, string | number | boolean>,
): Promise<AuditTrailPage> {
  const res = await request.get('/api/admin/audit', {
    headers: { Authorization: `Bearer ${token}` },
    params: qs,
  });
  return res.json();
}

export async function apiCleanupAdminLeave(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const res = await request.get('/api/admin/leave', {
    headers: { Authorization: `Bearer ${token}` },
    params: { pageSize: 100 },
  });
  const body: PagedResult = await res.json();
  await Promise.all(body.items.map(({ id }) => apiAdminDeleteLeave(request, token, id)));
}
