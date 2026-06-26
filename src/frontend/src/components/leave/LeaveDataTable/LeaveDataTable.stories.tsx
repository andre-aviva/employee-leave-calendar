import type { Meta, StoryObj } from '@storybook/react';
import { LeaveDataTable } from './LeaveDataTable';

const mockData = [
  {
    id: '1',
    leaveTypeId: 'l1',
    leaveTypeName: 'Vacation',
    colourHex: '#10B981',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    description: 'Summer holiday',
  },
  {
    id: '2',
    leaveTypeId: 'l2',
    leaveTypeName: 'Sick Leave',
    colourHex: '#F59E0B',
    startDate: '2026-06-10',
    endDate: '2026-06-11',
    description: 'Flu',
  },
  {
    id: '3',
    leaveTypeId: 'l3',
    leaveTypeName: 'Public Holiday',
    colourHex: '#6366F1',
    startDate: '2026-12-25',
    endDate: '2026-12-25',
    description: 'Christmas',
  },
];

const meta: Meta<typeof LeaveDataTable> = {
  title: 'Leave/LeaveDataTable',
  component: LeaveDataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: mockData,
    onEdit: (id) => console.log('Edit', id),
    onDelete: (id) => console.log('Delete', id),
  },
};

export const Empty: Story = {
  args: {
    data: [],
    onEdit: (id) => console.log('Edit', id),
    onDelete: (id) => console.log('Delete', id),
  },
};
