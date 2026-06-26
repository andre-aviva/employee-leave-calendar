export type CalendarOverviewResources = {
  title: string;
  nextMonth: string;
  previousMonth: string;
  months: string[];
};

export const resources: CalendarOverviewResources = {
  title: 'Calendar Overview',
  nextMonth: 'Next',
  previousMonth: 'Previous',
  months: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
};
