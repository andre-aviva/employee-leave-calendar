import { client } from './client';

export type EmployeeDto = {
  id: string;
  name: string;
};

export const employeeApi = {
  listEmployees: () => client.get<EmployeeDto[]>('/api/employees'),
};
