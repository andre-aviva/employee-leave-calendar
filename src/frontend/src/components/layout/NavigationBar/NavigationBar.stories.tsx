import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { NavigationBar } from './NavigationBar';

const meta: Meta<typeof NavigationBar> = {
  title: 'Layout/NavigationBar',
  component: NavigationBar,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Employee: Story = {
  args: {
    userName: 'Alice Johnson',
    role: 'Employee',
  },
};

export const Admin: Story = {
  args: {
    userName: 'Bob Smith',
    role: 'Admin',
  },
};
