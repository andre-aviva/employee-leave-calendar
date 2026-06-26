import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Calendar } from 'lucide-react';
import styles from './DatePicker.module.scss';

export type DatePickerProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, className, disabled, id, ...props }, ref) => {
    const inputId = id || `date-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const dataTest = (props as any)['data-test'] || `DatePicker_${label}`;

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
            type="date"
            className={styles.input}
            disabled={disabled}
            data-test={dataTest}
            {...props}
          />
          <div className={styles.icon}>
            <Calendar size={16} />
          </div>
        </div>
        {error && <span className={styles.error}>{error}</span>}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
