/**
 * Formats a Date as an ISO yyyy-MM-dd string using its LOCAL calendar parts.
 *
 * `Date.toISOString()` must not be used for calendar dates: it converts to UTC,
 * so a local-midnight Date in a UTC+ timezone (e.g. Europe/Amsterdam) rolls back
 * to the previous day. This keeps the day the user sees.
 */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string (ISO) to DD-MM-YYYY
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
}

/**
 * Calculates the number of days between two dates inclusive
 */
export function calculateDuration(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}
