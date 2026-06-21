export type EmployeeRole = 'Employee' | 'Admin';

export interface TestEmployee {
  id: string;
  username: string;
  password: string;
  name: string;
  role: EmployeeRole;
}

export interface TestLeaveType {
  id: string;
  name: string;
  registerableBy: EmployeeRole[];
}

export interface TestLeaveRegistration {
  leaveType: TestLeaveType;
  startDate: string;
  endDate: string;
  description?: string;
  notes?: string;
}
