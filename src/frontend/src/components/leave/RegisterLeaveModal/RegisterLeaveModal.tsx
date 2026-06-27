import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { Modal } from '../../core/Modal/Modal';
import { Dropdown } from '../../forms/Dropdown/Dropdown';
import { DatePicker } from '../../forms/DatePicker/DatePicker';
import { TextField } from '../../forms/TextField/TextField';
import { TextArea } from '../../forms/TextArea/TextArea';
import { Button } from '../../core/Button/Button';
import { referenceApi } from '../../../api/reference';
import { employeeApi } from '../../../api/employees';
import type { AdminCreateLeaveRequest } from '../../../api/admin';
import { ApiError } from '../../../api/client';
import styles from './RegisterLeaveModal.module.scss';
import { resources } from './RegisterLeaveModal.resources';

export type RegisterLeaveModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  isSubmitting?: boolean;
  isAdmin?: boolean;
};

export function RegisterLeaveModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
  isAdmin = false,
}: RegisterLeaveModalProps) {
  const { data: leaveTypes = [] } = useSWR('/api/leave-types', () => referenceApi.listLeaveTypes());
  const { data: employees = [] } = useSWR(isAdmin ? '/api/employees' : null, () => employeeApi.listEmployees());
  
  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AdminCreateLeaveRequest>({
    defaultValues: initialData || {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  });

  const today = new Date().toISOString().split('T')[0];

  const notesValue = watch('notes') || '';

  const handleFormSubmit = async (data: AdminCreateLeaveRequest) => {
    clearErrors('root');
    try {
      await onSubmit(data);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'OVERLAP':
            setError('root', { message: isAdmin ? resources.errorOverlapAdmin : resources.errorOverlapEmployee });
            break;
          case 'TYPE_NOT_REGISTERABLE':
            setError('leaveTypeId', { message: resources.errorLeaveTypeNotRegisterable });
            break;
          case 'START_DATE_IN_PAST':
            setError('startDate', { message: resources.errorStartDatePast });
            break;
          default:
            setError('root', { message: resources.errorGeneric });
        }
      } else {
        setError('root', { message: resources.errorGeneric });
      }
    }
  };

  const leaveTypeOptions = leaveTypes
    .filter((t) => isAdmin || t.registerableBy === 'Employee')
    .map((t) => ({ value: t.id, label: t.name }));

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={resources.title} dataTest="LeaveForm">
      <form className={styles.form} onSubmit={handleSubmit(handleFormSubmit)}>
        {isAdmin && !initialData?.id && (
          <Dropdown
            label="Employee"
            options={employeeOptions}
            placeholder="Select employee"
            {...register('employeeId', { required: isAdmin })}
            error={errors.employeeId?.message}
            data-test="LeaveForm_EmployeeSelect"
          />
        )}

        <Dropdown
          label={resources.leaveTypeLabel}
          options={leaveTypeOptions}
          placeholder={resources.leaveTypePlaceholder}
          {...register('leaveTypeId', { required: resources.errorRequired })}
          error={errors.leaveTypeId?.message}
          data-test="LeaveForm_LeaveTypeSelect"
        />

        <div className={styles.dateRow}>
          <DatePicker
            label={resources.fromDateLabel}
            {...register('startDate', {
              required: resources.errorRequired,
              validate: isAdmin ? undefined : (value) => value >= today || resources.errorStartDatePast,
            })}
            error={errors.startDate?.message}
            data-test="LeaveForm_StartDateInput"
          />
          <DatePicker
            label={resources.toDateLabel}
            {...register('endDate', {
              required: resources.errorRequired,
              validate: (value, formValues) => !formValues.startDate || value >= formValues.startDate || resources.errorEndBeforeStart,
            })}
            error={errors.endDate?.message}
            data-test="LeaveForm_EndDateInput"
          />
        </div>

        <TextField
          label={resources.descriptionLabel}
          placeholder={resources.descriptionPlaceholder}
          {...register('description', { maxLength: 50 })}
          error={errors.description ? 'Max 50 characters' : undefined}
          data-test="LeaveForm_DescriptionInput"
        />

        <TextArea
          label={resources.notesLabel}
          placeholder={resources.notesPlaceholder}
          charCount={notesValue.length}
          maxCharCount={500}
          {...register('notes', { maxLength: 500 })}
          error={errors.notes ? 'Max 500 characters' : undefined}
          data-test="LeaveForm_NotesInput"
          data-test-char-counter="LeaveForm_NotesCharCounter"
        />

        {errors.root && (
          <div className={styles.formError} role="alert" data-test="LeaveForm_FormError">
            {errors.root.message}
          </div>
        )}

        <div className={styles.divider} />

        <div className={styles.actions}>
          <Button 
            variant="secondary" 
            onClick={onClose} 
            disabled={isSubmitting}
            data-test="LeaveForm_CancelButton"
          >
            {resources.cancelButton}
          </Button>
          <Button type="submit" isLoading={isSubmitting} data-test="LeaveForm_SubmitButton">
            {resources.submitButton}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
