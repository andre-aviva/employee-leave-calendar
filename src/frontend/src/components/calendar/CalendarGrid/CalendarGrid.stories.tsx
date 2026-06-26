import type { Meta, StoryObj } from '@storybook/react';
import { CalendarGrid } from './CalendarGrid';

const meta: Meta<typeof CalendarGrid> = {
  title: 'Calendar/CalendarGrid',
  component: CalendarGrid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const June2026: Story = {
  args: {
    year: 2026,
    month: 5, // June
    renderDay: (_date, isOtherMonth) => {
      if (isOtherMonth) return null;
      return null; // Empty cells for now
    },
  },
};
