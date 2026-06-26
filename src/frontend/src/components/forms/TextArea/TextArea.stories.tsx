import type { Meta, StoryObj } from '@storybook/react';
import { TextArea } from './TextArea';

const meta: Meta<typeof TextArea> = {
  title: 'Forms/TextArea',
  component: TextArea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Description',
    placeholder: 'Enter details here...',
  },
};

export const WithCharCount: Story = {
  args: {
    label: 'Notes',
    placeholder: 'Max 500 characters',
    charCount: 42,
    maxCharCount: 500,
  },
};

export const WithError: Story = {
  args: {
    label: 'Comments',
    error: 'This field is required.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Locked Notes',
    disabled: true,
    defaultValue: 'This content cannot be edited.',
  },
};
