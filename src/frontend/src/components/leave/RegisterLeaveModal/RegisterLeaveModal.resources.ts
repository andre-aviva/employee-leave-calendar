export type RegisterLeaveResources = {
  title: string;
  leaveTypeLabel: string;
  leaveTypePlaceholder: string;
  fromDateLabel: string;
  toDateLabel: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  cancelButton: string;
  submitButton: string;
  errorRequired: string;
};

export const resources: RegisterLeaveResources = {
  title: 'Register Leave',
  leaveTypeLabel: 'Leave Type',
  leaveTypePlaceholder: 'Select option',
  fromDateLabel: 'From',
  toDateLabel: 'To',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'Input value',
  notesLabel: 'Notes (optional)',
  notesPlaceholder: 'Add notes (optional, max 500 characters)',
  cancelButton: 'Cancel',
  submitButton: 'Register Leave',
  errorRequired: 'Required',
};
