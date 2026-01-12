'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from '@/components/ui/Menu';
import { Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { StudentRecord } from '@/app/actions/students';
import {
  deleteStudentDevices,
  passStudentAndDelete,
  failStudentResetDetails,
  deleteStudent,
} from '@/app/actions/students';
import { useRouter } from 'next/navigation';
import { DeleteWarning } from '@/components/ui/DeleteWarning';

export type StudentActionsProps = {
  student: StudentRecord;
  onOpenDetails: (student: StudentRecord) => void;
  onOpenEdit: (student: StudentRecord) => void;
};

export function StudentActions({ student, onOpenDetails, onOpenEdit }: StudentActionsProps) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [confirmAction, setConfirmAction] = React.useState<null | 'devices' | 'delete' | 'pass' | 'fail'>(null);

  function handleOpen(e: React.MouseEvent<HTMLButtonElement>) {
    setAnchorEl(e.currentTarget);
  }
  function handleClose() {
    setAnchorEl(null);
  }

  function formatErrorMessage(msg: string) {
    const m = String(msg || '').toLowerCase();
    if (m.includes('غير مصرح') || m.includes('unauthorized')) return 'غير مصرح: ليس لديك صلاحية لتنفيذ هذه العملية';
    return msg;
  }

  async function handleDeleteDevices() {
    handleClose();
    setConfirmAction('devices');
  }
  async function handlePass() {
    handleClose();
    setConfirmAction('pass');
  }
  async function handleFail() {
    handleClose();
    setConfirmAction('fail');
  }
  async function handleDeleteStudent() {
    handleClose();
    setConfirmAction('delete');
  }
  function handleEdit() {
    handleClose();
    onOpenEdit(student);
  }

  return (
    <>
      <Button variant="contained" color="secondary" onClick={handleOpen} aria-label="خيارات الطالب">
        إجراء
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        items={[
          {
            label: (
              <Stack direction="row" spacing={1} alignItems="center">
                <InfoOutlinedIcon fontSize="small" />
                <Typography>تفاصيل</Typography>
              </Stack>
            ),
            onClick: () => {
              handleClose();
              onOpenDetails(student);
            },
          },
          {
            label: (
              <Stack direction="row" spacing={1} alignItems="center">
                <DeleteOutlineIcon fontSize="small" />
                <Typography>حذف الأجهزة</Typography>
              </Stack>
            ),
            onClick: handleDeleteDevices,
            tone: 'error',
          },
          {
            label: (
              <Stack direction="row" spacing={1} alignItems="center">
                <DeleteOutlineIcon fontSize="small" />
                <Typography>حذف الطالب</Typography>
              </Stack>
            ),
            onClick: handleDeleteStudent,
            tone: 'error',
          },
          {
            label: (
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlineIcon fontSize="small" />
                <Typography>نجاح</Typography>
              </Stack>
            ),
            onClick: handlePass,
          },
          {
            label: (
              <Stack direction="row" spacing={1} alignItems="center">
                <CancelOutlinedIcon fontSize="small" />
                <Typography>رسوب</Typography>
              </Stack>
            ),
            onClick: handleFail,
          },
          {
            label: (
              <Stack direction="row" spacing={1} alignItems="center">
                <EditOutlinedIcon fontSize="small" />
                <Typography>تحرير</Typography>
              </Stack>
            ),
            onClick: handleEdit,
          },
        ]}
      />
      <DeleteWarning
        open={confirmAction !== null}
        title={
          confirmAction === 'devices'
            ? 'تأكيد حذف الأجهزة'
            : confirmAction === 'delete'
            ? 'تأكيد حذف الطالب'
            : confirmAction === 'pass'
            ? 'تأكيد جعل الطالب ناجح'
            : confirmAction === 'fail'
            ? 'تأكيد جعل الطالب راسب'
            : 'تأكيد الإجراء'
        }
        entityName={student.name}
        description={
          confirmAction === 'devices'
            ? 'سيتم حذف جميع الأجهزة المرتبطة بهذا الطالب نهائيًا.'
            : confirmAction === 'delete'
            ? 'سيتم حذف هذا الطالب نهائيًا ولا يمكن التراجع.'
            : confirmAction === 'pass'
            ? 'سيتم حذف سجل الطالب نهائيًا مع تسجيل الحالة كـ ناجح.'
            : confirmAction === 'fail'
            ? 'سيتم مسح جلسات الطالب ونتائج الامتحانات وتعيين الحالة "راسب".'
            : undefined
        }
        impacts={
          confirmAction === 'devices'
            ? ['حذف جميع الأجهزة المسجلة للطالب']
            : confirmAction === 'delete'
            ? ['حذف الحساب نهائيًا', 'حذف سجلات المحاسبة', 'حذف سجل الإجراءات']
            : confirmAction === 'pass'
            ? ['حذف سجل الطالب نهائيًا']
            : confirmAction === 'fail'
            ? ['مسح جميع الجلسات', 'حذف نتائج الامتحانات', 'تعيين الحالة: راسب']
            : undefined
        }
        confirmText={
          confirmAction === 'devices'
            ? 'تأكيد حذف الأجهزة'
            : confirmAction === 'delete'
            ? 'تأكيد حذف الطالب'
            : confirmAction === 'pass'
            ? 'تأكيد النجاح'
            : confirmAction === 'fail'
            ? 'تأكيد الرسوب'
            : 'تأكيد'
        }
        cancelText="إلغاء"
        onConfirm={async () => {
          if (confirmAction === 'devices') {
            const r = await deleteStudentDevices(student.id);
            if (r.ok) router.refresh();
            else alert(formatErrorMessage(r.error));
          } else if (confirmAction === 'delete') {
            const r = await deleteStudent(student.id);
            if (r.ok) router.refresh();
            else alert(formatErrorMessage(r.error));
          } else if (confirmAction === 'pass') {
            const r = await passStudentAndDelete(student.id);
            if (r.ok) router.refresh();
            else alert(formatErrorMessage(r.error));
          } else if (confirmAction === 'fail') {
            const r = await failStudentResetDetails(student.id);
            if (r.ok) router.refresh();
            else alert(formatErrorMessage(r.error));
          }
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}

export default StudentActions;
