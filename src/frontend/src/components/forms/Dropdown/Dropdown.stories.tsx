import type { Meta, StoryObj } from '@storybook/react';
import { Dropdown } from './Dropdown';

const options = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'holiday', label: 'Public Holiday' },
];

const meta: Meta<typeof Dropdown> = {
  title: 'Forms/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Leave Type',
    options,
    placeholder: 'Select a type',
  },
};

export const WithError: Story = {
  args: {
    label: 'Employee',
    options: [
      { value: '1', label: 'Alice Johnson' },
      { value: '2', label: 'Bob Smith' },
    ],
    error: 'Please select an employee.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Status',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
    ],
    disabled: true,
    defaultValue: 'pending',
  },
};
