import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker } from './DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'Forms/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Start Date',
  },
};

export const WithError: Story = {
  args: {
    label: 'End Date',
    error: 'Date cannot be in the past.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Date',
    disabled: true,
    defaultValue: '2026-06-25',
  },
};
