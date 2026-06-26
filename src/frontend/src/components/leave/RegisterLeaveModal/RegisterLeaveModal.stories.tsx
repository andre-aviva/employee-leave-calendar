import type { Meta, StoryObj } from '@storybook/react';
import { RegisterLeaveModal } from './RegisterLeaveModal';
import { SWRConfig } from 'swr';

const meta: Meta<typeof RegisterLeaveModal> = {
  title: 'Leave/RegisterLeaveModal',
  component: RegisterLeaveModal,
  decorators: [
    (Story) => (
      <SWRConfig value={{ provider: () => new Map() }}>
        <Story />
      </SWRConfig>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onSubmit: async (data) => { console.log(data); },
  },
};

export const AdminMode: Story = {
  args: {
    isOpen: true,
    isAdmin: true,
    onClose: () => {},
    onSubmit: async (data) => { console.log(data); },
  },
};
