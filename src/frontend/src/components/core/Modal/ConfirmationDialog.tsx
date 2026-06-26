import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './ConfirmationDialog.module.scss';

export type ConfirmationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  isConfirming?: boolean;
};

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isConfirming = false,
}: ConfirmationDialogProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      dataTest="ConfirmationDialog" 
      dataTestTitle="ConfirmationDialog_Title"
    >
      <div className={styles.container}>
        <p className={styles.message} data-test="ConfirmationDialog_Message">{message}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isConfirming} data-test="ConfirmationDialog_CancelButton">
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} isLoading={isConfirming} data-test="ConfirmationDialog_ConfirmButton">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
