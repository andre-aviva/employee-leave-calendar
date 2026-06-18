export type EmployeeRole = 'Employee' | 'Admin';

export interface TestEmployee {
  username: string;
  password: string;
  name: string;
  role: EmployeeRole;
}

export interface TestLeaveType {
  name: string;
  colour: string;
  registerableBy: EmployeeRole[];
}

export interface TestLeaveRegistration {
  leaveType: TestLeaveType;
  startDate: string;
  endDate: string;
  description?: string;
  notes?: string;
}
