import { client } from './client';
import type { RegisterLeaveRequest, MyLeaveDto } from './leave';

export type AdminLeaveDto = MyLeaveDto & {
  employeeId: string;
  employeeName: string;
};

export type AdminCreateLeaveRequest = RegisterLeaveRequest & {
  employeeId: string;
};

// GET /api/admin/leave returns a paged envelope, not a bare array.
export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export const adminApi = {
  // Unwraps the paged envelope to the items array. NOTE: this returns only the first
  // page (backend default pageSize 20); server-side paging/filtering is a follow-up.
  listAllLeave: async (search?: string, leaveTypeId?: string): Promise<AdminLeaveDto[]> => {
    let url = '/api/admin/leave';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (leaveTypeId) params.append('leaveTypeId', leaveTypeId);
    if (params.toString()) url += `?${params.toString()}`;
    const result = await client.get<PagedResult<AdminLeaveDto>>(url);
    return result.items;
  },
  createLeave: (data: AdminCreateLeaveRequest) => client.post('/api/admin/leave', data),
  editLeave: (id: string, data: RegisterLeaveRequest) => client.put(`/api/admin/leave/${id}`, data),
  deleteLeave: (id: string) => client.delete(`/api/admin/leave/${id}`),
};
