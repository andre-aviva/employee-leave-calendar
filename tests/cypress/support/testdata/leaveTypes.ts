import type { TestLeaveType } from '../types';

export const LEAVE_TYPE_VACATION: TestLeaveType = {
  id: '11111111-0000-0000-0000-000000000001',
  name: 'Vacation',
  registerableBy: ['Employee', 'Admin'],
};

export const LEAVE_TYPE_SICK_LEAVE: TestLeaveType = {
  id: '11111111-0000-0000-0000-000000000002',
  name: 'Sick Leave',
  registerableBy: ['Employee', 'Admin'],
};

export const LEAVE_TYPE_PUBLIC_HOLIDAY: TestLeaveType = {
  id: '11111111-0000-0000-0000-000000000003',
  name: 'Public Holiday',
  registerableBy: ['Admin'],
};

export const LEAVE_TYPE_OTHER: TestLeaveType = {
  id: '11111111-0000-0000-0000-000000000004',
  name: 'Other',
  registerableBy: ['Employee', 'Admin'],
};

export const ALL_LEAVE_TYPES = [
  LEAVE_TYPE_VACATION,
  LEAVE_TYPE_SICK_LEAVE,
  LEAVE_TYPE_PUBLIC_HOLIDAY,
  LEAVE_TYPE_OTHER,
] as const;

export const EMPLOYEE_REGISTERABLE_LEAVE_TYPES = ALL_LEAVE_TYPES.filter((t) =>
  t.registerableBy.includes('Employee'),
);
