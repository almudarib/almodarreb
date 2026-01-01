'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
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
      <Button variant="contained" color="secondary" onClick={handleOpen}>
        إجراء
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose} dir="rtl">
        <MenuItem
          onClick={() => {
            handleClose();
            onOpenDetails(student);
          }}
        >
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>تفاصيل</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteDevices}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>حذف الأجهزة</ListItemText>
        </MenuItem>
        <MenuItem onClick={handlePass}>
          <ListItemIcon>
            <CheckCircleOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>نجاح</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleFail}>
          <ListItemIcon>
            <CancelOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>رسوب</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>تحرير</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export default StudentActions;

