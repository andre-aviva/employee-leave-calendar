import type { TestEmployee } from '../types';

export const EMPLOYEE_ALICE_ADMIN: TestEmployee = {
  username: 'admin',
  password: 'Admin!123',
  name: 'Alice Admin',
  role: 'Admin',
};

export const EMPLOYEE_EDDIE_EMPLOYEE: TestEmployee = {
  username: 'employee',
  password: 'Employee!123',
  name: 'Eddie Employee',
  role: 'Employee',
};

export const EMPLOYEE_NORA_NEWBIE: TestEmployee = {
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
