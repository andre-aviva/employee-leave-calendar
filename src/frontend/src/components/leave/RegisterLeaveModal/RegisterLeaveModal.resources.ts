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
  errorStartDatePast: string;
  errorEndBeforeStart: string;
  errorLeaveTypeNotRegisterable: string;
  errorOverlapEmployee: string;
  errorOverlapAdmin: string;
  errorGeneric: string;
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
  errorStartDatePast: 'Start date must be today or in the future',
  errorEndBeforeStart: 'End date must be on or after the start date',
  errorLeaveTypeNotRegisterable: 'This leave type cannot be requested. Please select a different type.',
  errorOverlapEmployee: 'You already have leave registered for part of this period.',
  errorOverlapAdmin: 'This employee already has leave registered for part of this period.',
  errorGeneric: 'Something went wrong. Please try again.',
};
