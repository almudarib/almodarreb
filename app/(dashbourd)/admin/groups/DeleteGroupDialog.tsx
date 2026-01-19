'use client';

import * as React from 'react';
import { DeleteWarning } from '@/components/ui/DeleteWarning';
import { deleteExamGroup, type ExamGroupRecord } from '@/app/actions/exam';

export default function DeleteGroupDialog({
  open,
  group,
  onClose,
  onDeleted,
}: {
  open: boolean;
  group: ExamGroupRecord | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);

  return (
    <DeleteWarning
      open={open}
      onCancel={() => {
        onClose();
        setError(null);
      }}
      onConfirm={async () => {
        if (!group) return;
        const res = await deleteExamGroup(group.id);
        if (res.ok) {
          setError(null);
          onClose();
          onDeleted();
        } else {
          setError(res.error);
        }
      }}
      title="تأكيد حذف المجموعة"
      entityName={group?.title}
      impacts={['سيتم حذف الامتحانات والأسئلة والنتائج المرتبطة بالمجموعة']}
      confirmText="تأكيد المسح"
      dangerNote={error ?? undefined}
    />
  );
}
