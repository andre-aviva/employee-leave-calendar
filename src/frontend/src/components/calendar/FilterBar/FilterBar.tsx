import { TextField } from '../../forms/TextField/TextField';
import { Dropdown } from '../../forms/Dropdown/Dropdown';
import type { DropdownOption } from '../../forms/Dropdown/Dropdown';
import styles from './FilterBar.module.scss';
import { resources } from './FilterBar.resources';

export type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  selectedLeaveType: string;
  onLeaveTypeChange: (value: string) => void;
  leaveTypeOptions: DropdownOption[];
  'data-test-search'?: string;
  'data-test-type'?: string;
};

export function FilterBar({
  search,
  onSearchChange,
  selectedLeaveType,
  onLeaveTypeChange,
  leaveTypeOptions,
  'data-test-search': dataTestSearch,
  'data-test-type': dataTestType,
}: FilterBarProps) {
  const options = [
    { value: '', label: resources.allTypes },
    ...leaveTypeOptions,
  ];

  return (
    <div className={styles.container} data-test="FilterBar">
      <TextField
        label={resources.searchLabel}
        placeholder={resources.searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.field}
        data-test={dataTestSearch}
      />
      <Dropdown
        label={resources.typeLabel}
        options={options}
        value={selectedLeaveType}
        onChange={(e) => onLeaveTypeChange(e.target.value)}
        className={styles.field}
        data-test={dataTestType}
      />
    </div>
  );
}
