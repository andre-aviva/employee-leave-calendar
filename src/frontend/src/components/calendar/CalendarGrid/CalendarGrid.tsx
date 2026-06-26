import type { ReactNode } from 'react';
import clsx from 'clsx';
import { CalendarDateCell } from '../CalendarDateCell/CalendarDateCell';
import styles from './CalendarGrid.module.scss';
import { resources } from './CalendarGrid.resources';

export type CalendarGridProps = {
  year: number;
  month: number; // 0-indexed
  renderDay: (date: Date, isOtherMonth: boolean) => ReactNode;
  className?: string;
};

export function CalendarGrid({ year, month, renderDay, className }: CalendarGridProps) {
  const getDaysInMonth = (y: number, m: number) => {
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    
    // Start of the grid (previous month days)
    // Adjust for Monday start (0=Sun, 1=Mon, ...)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days: { date: Date; isOtherMonth: boolean }[] = [];

    // Previous month
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: new Date(y, m, -i), isOtherMonth: true });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(y, m, i), isOtherMonth: false });
    }

    // Next month
    const totalDays = 42; // 6 rows * 7 days
    const remainingDays = totalDays - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(y, m + 1, i), isOtherMonth: true });
    }

    return days;
  };

  const days = getDaysInMonth(year, month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={clsx(styles.grid, className)} data-test="CalendarGrid">
      {resources.weekdays.map((day) => (
        <div key={day} className={styles.weekdayHeader}>
          {day}
        </div>
      ))}
      {days.map(({ date, isOtherMonth }) => {
        const isToday = date.getTime() === today.getTime();
        return (
          <CalendarDateCell
            key={date.toISOString()}
            date={date.getDate()}
            isToday={isToday}
            isOtherMonth={isOtherMonth}
          >
            {renderDay(date, isOtherMonth)}
          </CalendarDateCell>
        );
      })}
    </div>
  );
}
