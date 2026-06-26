import { client } from './client';

export type SignInRequest = {
  username: string;
  password: string;
};

export type SignInResponse = {
  token: string;
  name: string;
  role: 'Employee' | 'Admin';
};

export const authApi = {
  signIn: (data: SignInRequest) => client.post<SignInResponse>('/api/auth/sign-in', data),
};
