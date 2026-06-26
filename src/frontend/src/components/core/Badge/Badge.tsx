import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Badge.module.scss';

export type BadgeVariant = 'vacation' | 'sick' | 'holiday' | 'other' | 'neutral';

export type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={clsx(styles.badge, styles[`badge--${variant}`], className)}
      data-test={`Badge_${variant}`}
    >
      {children}
    </span>
  );
}
