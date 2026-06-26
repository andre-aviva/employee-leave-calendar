import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Core/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Vacation: Story = {
  args: {
    children: 'Vacation',
    variant: 'vacation',
  },
};

export const SickLeave: Story = {
  args: {
    children: 'Sick Leave',
    variant: 'sick',
  },
};

export const PublicHoliday: Story = {
  args: {
    children: 'Public Holiday',
    variant: 'holiday',
  },
};

export const Other: Story = {
  args: {
    children: 'Other',
    variant: 'other',
  },
};

export const Neutral: Story = {
  args: {
    children: 'Pending',
    variant: 'neutral',
  },
};
