import type { Meta, StoryObj } from '@storybook/react';
import { FilterBar } from './FilterBar';

const meta: Meta<typeof FilterBar> = {
  title: 'Calendar/FilterBar',
  component: FilterBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    search: '',
    onSearchChange: (v) => console.log('Search:', v),
    selectedLeaveType: '',
    onLeaveTypeChange: (v) => console.log('Type:', v),
    leaveTypeOptions: [
      { value: '1', label: 'Vacation' },
      { value: '2', label: 'Sick Leave' },
    ],
  },
};
