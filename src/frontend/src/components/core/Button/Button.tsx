import type { ReactNode, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Button.module.scss';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'medium' | 'small';
  isLoading?: boolean;
};

export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  className,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        styles.button,
        styles[`button--${variant}`],
        styles[`button--${size}`],
        isLoading && styles['button--loading'],
        className
      )}
      disabled={disabled || isLoading}
      type={type}
      data-test="Button"
      {...props}
    >
      {children}
    </button>
  );
}
