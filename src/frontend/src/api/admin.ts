import { client } from './client';
import type { RegisterLeaveRequest, MyLeaveDto } from './leave';

export type AdminLeaveDto = MyLeaveDto & {
  employeeId: string;
  employeeName: string;
};

export type AdminCreateLeaveRequest = RegisterLeaveRequest & {
  employeeId: string;
};

export const adminApi = {
  listAllLeave: (search?: string, leaveTypeId?: string) => {
    let url = '/api/admin/leave';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (leaveTypeId) params.append('leaveTypeId', leaveTypeId);
    if (params.toString()) url += `?${params.toString()}`;
    return client.get<AdminLeaveDto[]>(url);
  },
  createLeave: (data: AdminCreateLeaveRequest) => client.post('/api/admin/leave', data),
  editLeave: (id: string, data: RegisterLeaveRequest) => client.put(`/api/admin/leave/${id}`, data),
  deleteLeave: (id: string) => client.delete(`/api/admin/leave/${id}`),
};
