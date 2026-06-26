import clsx from 'clsx';
import styles from './EmployeeLeaveChip.module.scss';

export type EmployeeLeaveChipProps = {
  employeeName: string;
  leaveTypeName: string;
  description?: string;
  notes?: string;
  className?: string;
};

export function EmployeeLeaveChip({
  employeeName,
  leaveTypeName,
  description,
  notes,
  className,
}: EmployeeLeaveChipProps) {
  const getVariantClass = (name: string) => {
    const normalized = name.toLowerCase();
    if (normalized.includes('vacation')) return styles.vacation;
    if (normalized.includes('sick')) return styles.sick;
    if (normalized.includes('holiday')) return styles.holiday;
    return styles.other;
  };

  return (
    <div
      className={clsx(styles.chip, getVariantClass(leaveTypeName), className)}
      title={notes ? `Notes: ${notes}` : undefined}
      data-test="EmployeeLeaveChip"
    >
      <span className={styles.name}>{employeeName}</span>
      {description && <span className={styles.description}>{description}</span>}
    </div>
  );
}
