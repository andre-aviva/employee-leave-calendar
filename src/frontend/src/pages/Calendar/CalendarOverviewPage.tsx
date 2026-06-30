import { useState, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import clsx from 'clsx';
import { CalendarGrid } from '../../components/calendar/CalendarGrid/CalendarGrid';
import { EmployeeLeaveChip } from '../../components/calendar/EmployeeLeaveChip/EmployeeLeaveChip';
import { FilterBar } from '../../components/calendar/FilterBar/FilterBar';
import { Button } from '../../components/core/Button/Button';
import { client } from '../../api/client';
import { referenceApi } from '../../api/reference';
import type { CalendarEntryDto } from '../../api/leave';
import { toIsoDate } from '../../utils/date';
import styles from './CalendarOverviewPage.module.scss';
import { resources } from './CalendarOverviewPage.resources';

export function CalendarOverviewPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate range for fetching (local calendar dates, not UTC — see toIsoDate)
  const from = toIsoDate(new Date(year, month, 1));
  const to = toIsoDate(new Date(year, month + 1, 0));

  const { data: calendarData = [], error, isLoading } = useSWR(
    `/api/calendar?from=${from}&to=${to}`,
    () => client.get<CalendarEntryDto[]>(`/api/calendar?from=${from}&to=${to}`)
  );

  const { data: leaveTypes = [] } = useSWR('/api/leave-types', () => referenceApi.listLeaveTypes());
  const { mutate } = useSWRConfig();

  const filteredData = useMemo(() => {
    return calendarData.filter((entry) => {
      const matchesSearch = entry.employeeName.toLowerCase().includes(search.toLowerCase());
      const matchesType = !selectedLeaveType || entry.leaveTypeId === selectedLeaveType;
      return matchesSearch && matchesType;
    });
  }, [calendarData, search, selectedLeaveType]);

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const leaveTypeOptions = leaveTypes.map((t) => ({ value: t.id, label: t.name }));

  const renderDay = (date: Date, isOtherMonth: boolean) => {
    if (isOtherMonth) return null;

    const dateStr = toIsoDate(date);
    const dayEntries = filteredData.filter((entry) => {
      return dateStr >= entry.startDate && dateStr <= entry.endDate;
    });

    return dayEntries.map((entry) => (
      <EmployeeLeaveChip
        key={entry.id}
        employeeName={entry.employeeName}
        leaveTypeName={entry.leaveTypeName}
      />
    ));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{resources.title}</h1>
        <div className={styles.controls}>
          <Button 
            variant="secondary" 
            size="small" 
            onClick={handlePreviousMonth}
            data-test="CalendarPage_PrevButton"
          >
            {resources.previousMonth}
          </Button>
          <span className={styles.currentMonth} data-test="CalendarPage_MonthLabel">
            {resources.months[month]} {year}
          </span>
          <Button 
            variant="secondary" 
            size="small" 
            onClick={handleNextMonth}
            data-test="CalendarPage_NextButton"
          >
            {resources.nextMonth}
          </Button>
        </div>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        selectedLeaveType={selectedLeaveType}
        onLeaveTypeChange={setSelectedLeaveType}
        leaveTypeOptions={leaveTypeOptions}
      />

      <div className={styles.legend} data-test="CalendarPage_Legend">
        {leaveTypes.map(type => {
          const typeName = type.name.toLowerCase();
          const colorClass = typeName.includes('vacation') ? 'vacation' :
                           typeName.includes('sick') ? 'sickleave' :
                           typeName.includes('holiday') ? 'publicholiday' : 'other';
          return (
            <div key={type.id} className={styles.legendItem}>
              <div className={clsx(styles.legendColor, styles[colorClass])} />
              <span>{type.name}</span>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <p>Loading calendar...</p>
      ) : error ? (
        <div data-test="CalendarPage_ErrorState">
          <p>Something went wrong. Please try again.</p>
          <Button onClick={() => mutate(`/api/calendar?from=${from}&to=${to}`)} data-test="CalendarPage_RetryButton">Retry</Button>
        </div>
      ) : (
        <CalendarGrid year={year} month={month} renderDay={renderDay} />
      )}
    </div>
  );
}
