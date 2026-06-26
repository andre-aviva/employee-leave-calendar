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

// Backend serves the current user's leave under /api/me/leave (see Leave/*Endpoint.cs).
// Exported so SWR cache keys reference the same path and cannot drift from the requests.
export const MY_LEAVE_PATH = '/api/me/leave';

export const leaveApi = {
  listMyLeave: () => client.get<MyLeaveDto[]>(MY_LEAVE_PATH),
  registerMyLeave: (data: RegisterLeaveRequest) => client.post(MY_LEAVE_PATH, data),
  editMyLeave: (id: string, data: RegisterLeaveRequest) => client.put(`${MY_LEAVE_PATH}/${id}`, data),
  deleteMyLeave: (id: string) => client.delete(`${MY_LEAVE_PATH}/${id}`),
};
