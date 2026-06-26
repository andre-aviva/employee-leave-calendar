import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmationDialog } from './ConfirmationDialog';

const meta: Meta<typeof ConfirmationDialog> = {
  title: 'Core/ConfirmationDialog',
  component: ConfirmationDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item? This action is permanent.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    onClose: () => {},
    onConfirm: () => alert('Confirmed'),
  },
};

export const Loading: Story = {
  args: {
    isOpen: true,
    title: 'Saving Changes',
    message: 'Please confirm you want to save these changes.',
    confirmLabel: 'Save',
    cancelLabel: 'Cancel',
    isConfirming: true,
    onClose: () => {},
    onConfirm: () => {},
  },
};
