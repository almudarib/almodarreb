'use client';

import * as React from 'react';
import { DeleteWarning } from '@/components/ui/DeleteWarning';
import { deleteUserByKind } from '@/app/actions/users';
import type { UserSummary } from '@/app/actions/users';

export default function DeleteUserDialog({
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
  return (
    <DeleteWarning
      open={open}
      title={user?.kind === 'teacher' ? 'تأكيد حذف المعلم' : 'تأكيد حذف المسؤول'}
      entityName={user?.name}
      description={
        user?.kind === 'teacher'
          ? 'سيتم حذف هذا المعلم وكل بياناته نهائيًا.'
          : 'سيتم حذف هذا المسؤول نهائيًا ولا يمكن التراجع.'
      }
      impacts={
        user?.kind === 'teacher'
          ? [
              'سيتم حذف جميع الطلاب المرتبطين بهذا المعلم',
              'سيتم حذف أجهزة الطلاب المرتبطة',
              'سيتم حذف جلسات الطلاب ونتائج الاختبارات',
              'سيتم حذف سجلات المحاسبة الخاصة بالمعلم',
              'سيتم حذف إعدادات محاسبة المعلم',
              'سيتم حذف الحساب نهائيًا',
            ]
          : [
              'سيتم حذف الحساب الإداري نهائيًا',
              'سيفقد هذا المستخدم صلاحيات الإدارة بالكامل',
              'لن يتمكن من الوصول إلى لوحة التحكم',
            ]
      }
      confirmText="تأكيد الحذف"
      cancelText="إلغاء"
      onConfirm={async () => {
        if (!user) return;
        const res = await deleteUserByKind(user.kind, user.id);
        if (res.ok) {
          setMessage(
            user.kind === 'teacher'
              ? 'تم حذف المعلم وكل طلابه بنجاح'
              : 'تم حذف المسؤول بنجاح'
          );
          onDeleted();
          onClose();
        } else {
          setError(
            user.kind === 'teacher'
              ? (res.error ?? 'فشل حذف المعلم')
              : (res.error ?? 'فشل حذف المسؤول')
          );
        }
      }}
      onCancel={onClose}
    />
  );
}
