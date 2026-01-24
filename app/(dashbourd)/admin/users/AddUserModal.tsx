'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import AddUserForm from './AddUserForm';
import { CircularProgress } from '@mui/material';

export default function AddUserModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      onCancel={onClose}
      title="إضافة مستخدم جديد"
      submitText={
        submitting ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <CircularProgress size={16} />
            جارٍ الإضافة...
          </span>
        ) : (
          'إضافة'
        )
      }
      submitDisabled={submitting}
      onSubmit={() => {
        const form = document.getElementById('add-user-form') as HTMLFormElement | null;
        if (form) form.requestSubmit();
      }}
      fullWidth
      maxWidth="sm"
    >
      <AddUserForm
        formId="add-user-form"
        onSubmittingChange={setSubmitting}
        onCreated={() => {
          onAdded();
          onClose();
        }}
      />
    </Modal>
  );
}
