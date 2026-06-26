import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './TextField.module.scss';

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  description?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, description, className, disabled, id, ...props }, ref) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const dataTest = (props as any)['data-test'] || `TextField_${label}`;

    return (
      <div className={clsx(styles.container, disabled && styles['container--disabled'], className)}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <div
          className={clsx(
            styles.inputWrapper,
            error && styles['inputWrapper--error'],
            disabled && styles['inputWrapper--disabled']
          )}
        >
          <input
            id={inputId}
            ref={ref}
            className={styles.input}
            disabled={disabled}
            data-test={dataTest}
            {...props}
          />
        </div>
        {error && <span className={styles.error}>{error}</span>}
        {!error && description && <span className={styles.description}>{description}</span>}
      </div>
    );
  }
);

TextField.displayName = 'TextField';
