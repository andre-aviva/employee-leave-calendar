import { client } from './client';

export type LeaveType = {
  id: string;
  name: string;
  colourHex: string;
  // Backend sends the enum as a string ("Employee" | "Admin"); it is NOT a boolean.
  registerableBy: 'Employee' | 'Admin';
};

export const referenceApi = {
  listLeaveTypes: () => client.get<LeaveType[]>('/api/leave-types'),
};
