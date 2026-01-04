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
import { deleteStudentDevices, setStudentStatus } from '@/app/actions/students';
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

  async function handleDeleteDevices() {
    handleClose();
    if (!confirm('هل أنت متأكد من حذف الأجهزة لهذا الطالب؟')) return;
    const r = await deleteStudentDevices(student.id);
    if (r.ok) router.refresh();
    else alert(r.error);
  }
  async function handlePass() {
    handleClose();
    const r = await setStudentStatus(student.id, 'passed');
    if (r.ok) router.refresh();
    else alert(r.error);
  }
  async function handleFail() {
    handleClose();
    const r = await setStudentStatus(student.id, 'failed');
    if (r.ok) router.refresh();
    else alert(r.error);
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
