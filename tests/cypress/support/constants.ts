export const TEXTS = {
  MY_LEAVE: {
    EMPTY_STATE: 'No leave registered',
    ERROR_STATE: 'Something went wrong. Please try again.',
    FORM_START_DATE_ERROR: 'Start date must be today or in the future',
    FORM_END_DATE_ERROR: 'End date must be on or after the start date',
    FORM_OVERLAP_ERROR: 'You already have leave registered for part of this period.',
  },
  LEAVE_MANAGEMENT: {
    EMPTY_STATE: 'No leave registered',
    ERROR_STATE: 'Something went wrong. Please try again.',
    FORM_END_DATE_ERROR: 'End date must be on or after the start date',
    FORM_OVERLAP_ERROR: 'This employee already has leave registered for part of this period.',
  },
  CALENDAR: {
    ERROR_STATE: 'Something went wrong. Please try again.',
  },
  CONFIRMATION_DIALOG: {
    TITLE: 'Delete leave registration',
    MESSAGE: 'Are you sure you want to delete this leave registration? This action cannot be undone.',
    CONFIRM_LABEL: 'Delete',
    CANCEL_LABEL: 'Cancel',
  },
} as const;
