import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './CalendarDateCell.module.scss';
import { resources } from './CalendarDateCell.resources';

export type CalendarDateCellProps = {
  date: number;
  isToday?: boolean;
  isOtherMonth?: boolean;
  children?: ReactNode;
  className?: string;
};

export function CalendarDateCell({
  date,
  isToday = false,
  isOtherMonth = false,
  children,
  className,
}: CalendarDateCellProps) {
  return (
    <div
      className={clsx(
        styles.cell,
        isToday && styles['cell--today'],
        isOtherMonth && styles['cell--otherMonth'],
        className
      )}
      data-test="CalendarGrid_DayCell"
      data-today={isToday || undefined}
    >
      <div className={styles.header}>
        <span className={styles.dateNumber}>{date}</span>
        {isToday && <span className={styles.todayBadge}>{resources.todayLabel}</span>}
      </div>
      <div className={styles.chips}>{children}</div>
    </div>
  );
}
