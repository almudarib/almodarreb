'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import AddUserForm from './AddUserForm';

export default function AddUserModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      onCancel={onClose}
      title="إضافة مستخدم جديد"
      submitText="إضافة"
      onSubmit={() => {
        const form = document.getElementById('add-user-form') as HTMLFormElement | null;
        if (form) form.requestSubmit();
      }}
      fullWidth
      maxWidth="sm"
    >
      <AddUserForm
        formId="add-user-form"
        onCreated={() => {
          onAdded();
          onClose();
        }}
      />
    </Modal>
  );
}
