import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './TextArea.module.scss';

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  description?: string;
  charCount?: number;
  maxCharCount?: number;
  'data-test-char-counter'?: string;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, description, charCount, maxCharCount, className, disabled, id, 'data-test-char-counter': dataTestCharCounter, ...props }, ref) => {
    const textareaId = id || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const dataTest = (props as any)['data-test'] || `TextArea_${label}`;

    return (
      <div className={clsx(styles.container, disabled && styles['container--disabled'], className)}>
        <label htmlFor={textareaId} className={styles.label}>
          {label}
        </label>
        <div
          className={clsx(
            styles.textareaWrapper,
            error && styles['textareaWrapper--error'],
            disabled && styles['textareaWrapper--disabled']
          )}
        >
          <textarea
            id={textareaId}
            ref={ref}
            className={styles.textarea}
            disabled={disabled}
            data-test={dataTest}
            {...props}
          />
        </div>
        <div className={styles.footer}>
          {error && <span className={styles.error}>{error}</span>}
          {!error && description && <span className={styles.description}>{description}</span>}
          {maxCharCount !== undefined && (
            <span className={styles.charCount} data-test={dataTestCharCounter}>
              {charCount || 0} / {maxCharCount}
            </span>
          )}
        </div>
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
