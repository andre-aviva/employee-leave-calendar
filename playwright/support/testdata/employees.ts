import type { TestEmployee } from '../types';

export const EMPLOYEE_ALICE_ADMIN: TestEmployee = {
  id: '22222222-0000-0000-0000-000000000001',
  username: 'admin',
  password: 'Admin!123',
  name: 'Alice Admin',
  role: 'Admin',
};

export const EMPLOYEE_EDDIE_EMPLOYEE: TestEmployee = {
  id: '22222222-0000-0000-0000-000000000002',
  username: 'employee',
  password: 'Employee!123',
  name: 'Eddie Employee',
  role: 'Employee',
};

export const EMPLOYEE_NORA_NEWBIE: TestEmployee = {
  id: '22222222-0000-0000-0000-000000000003',
  username: 'nora',
  password: 'Employee!123',
  name: 'Nora Newbie',
  role: 'Employee',
};

export const ALL_EMPLOYEES = [
  EMPLOYEE_ALICE_ADMIN,
  EMPLOYEE_EDDIE_EMPLOYEE,
  EMPLOYEE_NORA_NEWBIE,
] as const;

export const ADMIN_EMPLOYEES = ALL_EMPLOYEES.filter((e) => e.role === 'Admin');
export const STANDARD_EMPLOYEES = ALL_EMPLOYEES.filter((e) => e.role === 'Employee');
