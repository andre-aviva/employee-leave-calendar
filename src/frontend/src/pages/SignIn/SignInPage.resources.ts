export type SignInResources = {
  title: string;
  subtitle: string;
  usernameLabel: string;
  passwordLabel: string;
  submitButton: string;
  errorInvalidCredentials: string;
  errorGeneric: string;
};

export const resources: SignInResources = {
  title: 'Employee Leave Calendar',
  subtitle: 'Sign in to your account',
  usernameLabel: 'Email address',
  passwordLabel: 'Password',
  submitButton: 'Sign In',
  errorInvalidCredentials: 'Invalid email or password.',
  errorGeneric: 'An error occurred. Please try again.',
};
