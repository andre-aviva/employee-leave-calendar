import type { Meta, StoryObj } from '@storybook/react';
import { TextField } from './TextField';

const meta: Meta<typeof TextField> = {
  title: 'Forms/TextField',
  component: TextField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
  },
};

export const WithDescription: Story = {
  args: {
    label: 'Password',
    description: 'Must be at least 8 characters.',
    type: 'password',
  },
};

export const WithError: Story = {
  args: {
    label: 'Username',
    error: 'Username is already taken.',
    defaultValue: 'alice',
  },
};

export const Disabled: Story = {
  args: {
    label: 'ID',
    disabled: true,
    defaultValue: 'EMP-001',
  },
};
