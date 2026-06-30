import { useState, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { LeaveDataTable } from '../../components/leave/LeaveDataTable/LeaveDataTable';
import { Button } from '../../components/core/Button/Button';
import { FilterBar } from '../../components/calendar/FilterBar/FilterBar';
import { RegisterLeaveModal } from '../../components/leave/RegisterLeaveModal/RegisterLeaveModal';
import { ConfirmationDialog } from '../../components/core/Modal/ConfirmationDialog';
import { adminApi } from '../../api/admin';
import { referenceApi } from '../../api/reference';
import type { AdminCreateLeaveRequest } from '../../api/admin';
import styles from './AdminLeavePage.module.scss';

export function AdminLeavePage() {
  const [search, setSearch] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');

  const { data: allLeave = [], error, isLoading } = useSWR('/api/admin/leave', () => adminApi.listAllLeave());
  const { data: leaveTypes = [] } = useSWR('/api/leave-types', () => referenceApi.listLeaveTypes());
  const { mutate } = useSWRConfig();

  const filteredLeave = useMemo(() => {
    return allLeave.filter(item => {
      const matchesSearch = item.employeeName.toLowerCase().includes(search.toLowerCase());
      const matchesType = !selectedLeaveType || item.leaveTypeId === selectedLeaveType;
      return matchesSearch && matchesType;
    });
  }, [allLeave, search, selectedLeaveType]);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegisterSubmit = async (data: AdminCreateLeaveRequest) => {
    setIsSubmitting(true);
    try {
      if (selectedLeaveId) {
        await adminApi.editLeave(selectedLeaveId, data);
      } else {
        await adminApi.createLeave(data);
      }
      await mutate('/api/admin/leave');
      setIsRegisterModalOpen(false);
      setSelectedLeaveId(null);
    } catch (e) {
      console.error(e);
      throw e; // let RegisterLeaveModal surface the server error inline
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLeaveId) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteLeave(selectedLeaveId);
      await mutate('/api/admin/leave');
      setIsDeleteModalOpen(false);
      setSelectedLeaveId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (id: string) => {
    setSelectedLeaveId(id);
    setIsRegisterModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setSelectedLeaveId(id);
    setIsDeleteModalOpen(true);
  };

  const initialData = selectedLeaveId 
    ? allLeave.find(r => r.id === selectedLeaveId)
    : undefined;

  const leaveTypeOptions = leaveTypes.map(t => ({ value: t.id, label: t.name }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Leave Management</h1>
        <Button 
          onClick={() => { setSelectedLeaveId(null); setIsRegisterModalOpen(true); }}
          data-test="AdminLeave_AddLeaveButton"
        >
          Register Leave
        </Button>
      </header>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        selectedLeaveType={selectedLeaveType}
        onLeaveTypeChange={setSelectedLeaveType}
        leaveTypeOptions={leaveTypeOptions}
        data-test-search="AdminLeave_EmployeeFilter"
        data-test-type="AdminLeave_TypeFilter"
      />

      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <div data-test="AdminLeave_ErrorState">
          <p>Something went wrong. Please try again.</p>
          <Button onClick={() => mutate('/api/admin/leave')} data-test="AdminLeave_RetryButton">Retry</Button>
        </div>
      ) : (
        <LeaveDataTable
          data={filteredLeave}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showEmployeeColumn
          data-test="AdminLeave_Table"
        />
      )}

      {isRegisterModalOpen && (
        <RegisterLeaveModal
          isOpen={isRegisterModalOpen}
          onClose={() => { setIsRegisterModalOpen(false); setSelectedLeaveId(null); }}
          onSubmit={handleRegisterSubmit}
          initialData={initialData}
          isSubmitting={isSubmitting}
          isAdmin
        />
      )}

      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedLeaveId(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete leave registration"
        message="Are you sure you want to delete this leave registration? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isConfirming={isSubmitting}
      />
    </div>
  );
}
