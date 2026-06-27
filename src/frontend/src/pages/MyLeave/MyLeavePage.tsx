import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { LeaveDataTable } from '../../components/leave/LeaveDataTable/LeaveDataTable';
import { Button } from '../../components/core/Button/Button';
import { RegisterLeaveModal } from '../../components/leave/RegisterLeaveModal/RegisterLeaveModal';
import { ConfirmationDialog } from '../../components/core/Modal/ConfirmationDialog';
import { leaveApi, MY_LEAVE_PATH } from '../../api/leave';
import type { RegisterLeaveRequest } from '../../api/leave';
import styles from './MyLeavePage.module.scss';
import { resources } from './MyLeavePage.resources';

export function MyLeavePage() {
  const { data: leaveRegistrations = [], isLoading } = useSWR(MY_LEAVE_PATH, () => leaveApi.listMyLeave());
  const { mutate } = useSWRConfig();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegisterSubmit = async (data: RegisterLeaveRequest) => {
    setIsSubmitting(true);
    try {
      if (selectedLeaveId) {
        await leaveApi.editMyLeave(selectedLeaveId, data);
      } else {
        await leaveApi.registerMyLeave(data);
      }
      await mutate(MY_LEAVE_PATH);
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
      await leaveApi.deleteMyLeave(selectedLeaveId);
      await mutate(MY_LEAVE_PATH);
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
    ? leaveRegistrations.find(r => r.id === selectedLeaveId)
    : undefined;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{resources.title}</h1>
        <Button 
          onClick={() => { setSelectedLeaveId(null); setIsRegisterModalOpen(true); }}
          data-test="MyLeave_RegisterButton"
        >
          {resources.registerButton}
        </Button>
      </header>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <LeaveDataTable
          data={leaveRegistrations}
          onEdit={handleEdit}
          onDelete={handleDelete}
          data-test="MyLeave_Table"
        />
      )}

      {isRegisterModalOpen && (
        <RegisterLeaveModal
          isOpen={isRegisterModalOpen}
          onClose={() => { setIsRegisterModalOpen(false); setSelectedLeaveId(null); }}
          onSubmit={handleRegisterSubmit}
          initialData={initialData}
          isSubmitting={isSubmitting}
        />
      )}

      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedLeaveId(null); }}
        onConfirm={handleDeleteConfirm}
        title={resources.deleteConfirmTitle}
        message={resources.deleteConfirmMessage}
        confirmLabel={resources.deleteConfirmAction}
        cancelLabel="Cancel"
        isConfirming={isSubmitting}
      />
    </div>
  );
}
