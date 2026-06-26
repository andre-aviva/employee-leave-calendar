import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { MyLeavePage } from './MyLeavePage';
import { AuthProvider } from '../../context/AuthContext';
import { SWRConfig } from 'swr';

const meta: Meta<typeof MyLeavePage> = {
  title: 'Pages/MyLeavePage',
  component: MyLeavePage,
  decorators: [
    (Story) => (
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter>
          <AuthProvider>
            <Story />
          </AuthProvider>
        </MemoryRouter>
      </SWRConfig>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
