import clsx from 'clsx';
import { Button } from '../../core/Button/Button';
import { LeaveTypeBadge } from '../LeaveTypeBadge/LeaveTypeBadge';
import type { MyLeaveDto } from '../../../api/leave';
import type { AdminLeaveDto } from '../../../api/admin';
import { formatDate, calculateDuration } from '../../../utils/date';
import styles from './LeaveDataTable.module.scss';
import { resources } from './LeaveDataTable.resources';

export type LeaveDataTableProps = {
  data: (MyLeaveDto | AdminLeaveDto)[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  showEmployeeColumn?: boolean;
  className?: string;
  'data-test'?: string;
};

export function LeaveDataTable({ data, onEdit, onDelete, showEmployeeColumn = false, className, 'data-test': dataTest }: LeaveDataTableProps) {
  if (data.length === 0) {
    const emptyStateDataTest = showEmployeeColumn ? 'AdminLeave_EmptyState' : 'MyLeave_EmptyState';
    return (
      <div 
        className={clsx(styles.tableContainer, styles.emptyState, className)}
        data-test={emptyStateDataTest}
      >
        {resources.emptyState}
      </div>
    );
  }

  return (
    <div className={clsx(styles.tableContainer, className)} data-test={dataTest}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={clsx(styles.th, styles.cellNumber)}>{resources.columnNumber}</th>
            {showEmployeeColumn && <th className={clsx(styles.th, styles.cellEmployee)}>{resources.columnEmployee}</th>}
            <th className={clsx(styles.th, styles.cellLeaveType)}>{resources.columnLeaveType}</th>
            <th className={clsx(styles.th, styles.cellFrom)}>{resources.columnFrom}</th>
            <th className={clsx(styles.th, styles.cellTo)}>{resources.columnTo}</th>
            <th className={clsx(styles.th, styles.cellDuration)}>{resources.columnDuration}</th>
            <th className={clsx(styles.th, styles.cellDescription)}>{resources.columnDescription}</th>
            <th className={styles.th} />
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr 
              key={item.id} 
              className={styles.tr}
              data-test={showEmployeeColumn ? 'AdminLeave_TableRow' : 'MyLeave_TableRow'}
            >
              <td className={clsx(styles.td, styles.cellNumber)}>{index + 1}</td>
              {showEmployeeColumn && (
                <td className={clsx(styles.td, styles.cellEmployee)}>
                  {(item as AdminLeaveDto).employeeName || '-'}
                </td>
              )}
              <td className={clsx(styles.td, styles.cellLeaveType)}>
                <LeaveTypeBadge typeName={item.leaveTypeName} />
              </td>
              <td className={clsx(styles.td, styles.cellFrom)}>{formatDate(item.startDate)}</td>
              <td className={clsx(styles.td, styles.cellTo)}>{formatDate(item.endDate)}</td>
              <td className={clsx(styles.td, styles.cellDuration)} data-test={showEmployeeColumn ? 'AdminLeave_DurationCell' : 'MyLeave_DurationCell'}>
                {resources.days(calculateDuration(item.startDate, item.endDate))}
              </td>
              <td className={clsx(styles.td, styles.cellDescription)} data-test={showEmployeeColumn ? 'AdminLeave_DescriptionCell' : 'MyLeave_DescriptionCell'}>{item.description || '-'}</td>
              <td className={clsx(styles.td, styles.cellActions)}>
                <div className={styles.actions}>
                  <Button 
                    variant="ghost" 
                    size="small" 
                    onClick={() => onEdit(item.id)}
                    data-test={showEmployeeColumn ? 'AdminLeave_EditButton' : 'MyLeave_EditButton'}
                  >
                    {resources.editAction}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="small" 
                    onClick={() => onDelete(item.id)}
                    data-test={showEmployeeColumn ? 'AdminLeave_DeleteButton' : 'MyLeave_DeleteButton'}
                  >
                    {resources.deleteAction}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
