export type LeaveDataTableResources = {
  columnNumber: string;
  columnEmployee: string;
  columnLeaveType: string;
  columnFrom: string;
  columnTo: string;
  columnDuration: string;
  columnDescription: string;
  columnActions: string;
  editAction: string;
  deleteAction: string;
  emptyState: string;
  days: (count: number) => string;
};

export const resources: LeaveDataTableResources = {
  columnNumber: '#',
  columnEmployee: 'Employee',
  columnLeaveType: 'Leave Type',
  columnFrom: 'From',
  columnTo: 'To',
  columnDuration: 'Duration',
  columnDescription: 'Description',
  columnActions: 'Actions',
  editAction: 'Edit',
  deleteAction: 'Delete',
  emptyState: 'No leave registrations found.',
  days: (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`,
};
