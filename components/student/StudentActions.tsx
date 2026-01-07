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

export type StudentActionsProps = {
  student: StudentRecord;
  onOpenDetails: (student: StudentRecord) => void;
};

export function StudentActions({ student, onOpenDetails }: StudentActionsProps) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

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
    if (!confirm('هل أنت متأكد من حذف الأجهزة لهذا الطالب؟')) return;
    const r = await deleteStudentDevices(student.id);
    if (r.ok) router.refresh();
    else alert(formatErrorMessage(r.error));
  }
  async function handlePass() {
    handleClose();
    if (!confirm('تأكيد: سيتم حذف سجل الطالب نهائيًا كـ نجاح. متابعة؟')) return;
    const r = await passStudentAndDelete(student.id);
    if (r.ok) router.refresh();
    else alert(formatErrorMessage(r.error));
  }
  async function handleFail() {
    handleClose();
    if (
      !confirm(
        'تأكيد: سيتم مسح جلسات الطالب ونتائج الامتحانات وسجل الإجراءات وتعيين الحالة "راسب". متابعة؟',
      )
    )
      return;
    const r = await failStudentResetDetails(student.id);
    if (r.ok) router.refresh();
    else alert(formatErrorMessage(r.error));
  }
  async function handleDeleteStudent() {
    handleClose();
    if (!confirm('تأكيد: سيتم حذف الطالب نهائيًا. متابعة؟')) return;
    const r = await deleteStudent(student.id);
    if (r.ok) router.refresh();
    else alert(formatErrorMessage(r.error));
  }
  function handleEdit() {
    handleClose();
    onOpenDetails(student);
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
    </>
  );
}

export default StudentActions;
