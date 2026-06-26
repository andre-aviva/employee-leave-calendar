import { client } from './client';

export type LeaveType = {
  id: string;
  name: string;
  colourHex: string;
  isRegisterableByEmployee: boolean;
};

export const referenceApi = {
  listLeaveTypes: () => client.get<LeaveType[]>('/api/leave-types'),
};
