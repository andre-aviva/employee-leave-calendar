import type { ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import styles from './Modal.module.scss';

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  dataTest?: string;
  dataTestTitle?: string;
};

export function Modal({ isOpen, onClose, title, children, className, dataTest, dataTestTitle }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} data-test={dataTest ? `${dataTest}_Backdrop` : undefined}>
      <div className={clsx(styles.modal, className)} onClick={(e) => e.stopPropagation()} data-test={dataTest}>
        <div className={styles.header}>
          <h2 className={styles.title} data-test={dataTestTitle}>{title}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
