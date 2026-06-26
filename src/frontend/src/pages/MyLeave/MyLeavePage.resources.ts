export type MyLeaveResources = {
  title: string;
  registerButton: string;
  registerSuccess: string;
  editSuccess: string;
  deleteSuccess: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  deleteConfirmAction: string;
};

export const resources: MyLeaveResources = {
  title: 'My Leave',
  registerButton: 'Register Leave',
  registerSuccess: 'Leave registration successful.',
  editSuccess: 'Leave registration updated.',
  deleteSuccess: 'Leave registration deleted.',
  deleteConfirmTitle: 'Delete leave registration',
  deleteConfirmMessage: 'Are you sure you want to delete this leave registration? This action cannot be undone.',
  deleteConfirmAction: 'Delete',
};
