import { client } from './client';

export type MyLeaveDto = {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  colourHex: string;
  startDate: string; // ISO yyyy-MM-dd
  endDate: string;   // ISO yyyy-MM-dd
  description?: string;
  notes?: string;
};

export type RegisterLeaveRequest = {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  description?: string;
  notes?: string;
};

export type CalendarEntryDto = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  colourHex: string;
  startDate: string;
  endDate: string;
};

export const leaveApi = {
  listMyLeave: () => client.get<MyLeaveDto[]>('/api/my/leave'),
  registerMyLeave: (data: RegisterLeaveRequest) => client.post('/api/my/leave', data),
  editMyLeave: (id: string, data: RegisterLeaveRequest) => client.put(`/api/my/leave/${id}`, data),
  deleteMyLeave: (id: string) => client.delete(`/api/my/leave/${id}`),
};
