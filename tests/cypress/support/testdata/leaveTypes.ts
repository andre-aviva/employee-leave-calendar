import type { TestLeaveType } from '../types';

export const LEAVE_TYPE_VACATION: TestLeaveType = {
  name: 'Vacation',
  registerableBy: ['Employee', 'Admin'],
};

export const LEAVE_TYPE_SICK_LEAVE: TestLeaveType = {
  name: 'Sick Leave',
  registerableBy: ['Employee', 'Admin'],
};

export const LEAVE_TYPE_PUBLIC_HOLIDAY: TestLeaveType = {
  name: 'Public Holiday',
  registerableBy: ['Admin'],
};

export const LEAVE_TYPE_OTHER: TestLeaveType = {
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
