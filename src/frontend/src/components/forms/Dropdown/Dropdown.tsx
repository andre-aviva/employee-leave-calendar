import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import styles from './Dropdown.module.scss';

export type DropdownOption = {
  value: string | number;
  label: string;
};

export type DropdownProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: DropdownOption[];
  error?: string;
  description?: string;
  placeholder?: string;
};

export const Dropdown = forwardRef<HTMLSelectElement, DropdownProps>(
  ({ label, options, error, description, placeholder, className, disabled, id, value, ...props }, ref) => {
    const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const isPlaceholderActive = placeholder && (value === undefined || value === '');
    const dataTest = (props as any)['data-test'] || `Dropdown_${label}`;

    return (
      <div className={clsx(styles.container, disabled && styles['container--disabled'], className)}>
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
        <div
          className={clsx(
            styles.selectWrapper,
            error && styles['selectWrapper--error'],
            disabled && styles['selectWrapper--disabled']
          )}
        >
          <select
            id={selectId}
            ref={ref}
            className={clsx(styles.select, isPlaceholderActive && styles['select--placeholder'])}
            disabled={disabled}
            value={value}
            data-test={dataTest}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className={styles.chevron}>
            <ChevronDown size={20} />
          </div>
        </div>
        {error && <span className={styles.error} data-test={`${dataTest.replace(/\w+$/, 'Error')}`}>{error}</span>}
        {!error && description && <span className={styles.description}>{description}</span>}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';
