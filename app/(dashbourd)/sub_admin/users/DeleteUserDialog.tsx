'use client';

import * as React from 'react';
import { DeleteWarning } from '@/components/ui/DeleteWarning';
import { deleteUserByKind } from '@/app/actions/users';
import type { UserSummary } from '@/app/actions/users';

export default function SubAdminDeleteUserDialog({
  open,
  user,
  onClose,
  onDeleted,
  setMessage,
  setError,
}: {
  open: boolean;
  user: UserSummary | null;
  onClose: () => void;
  onDeleted: () => void;
  setMessage: (msg: string | null) => void;
  setError: (msg: string | null) => void;
}) {
  if (!user || user.kind !== 'teacher') {
    return null;
  }
  return (
    <DeleteWarning
      open={open}
      title="تأكيد حذف المعلم"
      entityName={user?.name}
      description="سيتم حذف هذا المعلم وكل بياناته نهائيًا."
      impacts={[
        'سيتم حذف جميع الطلاب المرتبطين بهذا المعلم',
        'سيتم حذف أجهزة الطلاب المرتبطة',
        'سيتم حذف جلسات الطلاب ونتائج الاختبارات',
        'سيتم حذف سجلات المحاسبة الخاصة بالمعلم',
        'سيتم حذف إعدادات محاسبة المعلم',
        'سيتم حذف الحساب نهائيًا',
      ]}
      confirmText="تأكيد الحذف"
      cancelText="إلغاء"
      onConfirm={async () => {
        if (!user) return;
        const res = await deleteUserByKind(user.kind, user.id);
        if (res.ok) {
          setMessage('تم حذف المعلم وكل طلابه بنجاح');
          onDeleted();
          onClose();
        } else {
          setError(res.error ?? 'فشل حذف المعلم');
        }
      }}
      onCancel={onClose}
    />
  );
}
