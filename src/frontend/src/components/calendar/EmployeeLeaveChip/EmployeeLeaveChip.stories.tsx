import type { Meta, StoryObj } from '@storybook/react';
import { EmployeeLeaveChip } from './EmployeeLeaveChip';

const meta: Meta<typeof EmployeeLeaveChip> = {
  title: 'Calendar/EmployeeLeaveChip',
  component: EmployeeLeaveChip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Vacation: Story = {
  args: {
    employeeName: 'Alice Johnson',
    leaveTypeName: 'Vacation',
    description: 'Summer trip',
  },
};

export const SickLeave: Story = {
  args: {
    employeeName: 'Bob Smith',
    leaveTypeName: 'Sick Leave',
  },
};

export const PublicHoliday: Story = {
  args: {
    employeeName: 'All',
    leaveTypeName: 'Public Holiday',
    description: 'Christmas',
  },
};

export const WithNotes: Story = {
  args: {
    employeeName: 'Charlie Brown',
    leaveTypeName: 'Other',
    description: 'Personal',
    notes: 'Moving day',
  },
};
