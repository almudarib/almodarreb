'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import AddGroupForm from './AddGroupForm';

export default function AddGroupModal({
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
      title="إضافة مجموعة جديدة"
      submitText="إضافة"
      onSubmit={() => {
        const form = document.getElementById('add-group-form') as HTMLFormElement | null;
        if (form) form.requestSubmit();
      }}
      fullWidth
      maxWidth="sm"
    >
      <AddGroupForm
        formId="add-group-form"
        onCreated={() => {
          onAdded();
          onClose();
        }}
      />
    </Modal>
  );
}
