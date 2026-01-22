'use client';

import * as React from 'react';
import { Box, Chip, IconButton, Paper, Stack, Typography } from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import { Table } from '@/components/ui/Table';
import { Menu } from '@/components/ui/Menu';
import type { ExamGroupRecord } from '@/app/actions/exam';
import EditGroupModal from './EditGroupModal';
import DeleteGroupDialog from './DeleteGroupDialog';
import { useGroups } from './useGroups';

export default function GroupsTable() {
  const { groups, loading, reload } = useGroups();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selected, setSelected] = React.useState<ExamGroupRecord | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  function handleOpenMenu(e: React.MouseEvent<HTMLButtonElement>, g: ExamGroupRecord) {
    setSelected(g);
    setAnchorEl(e.currentTarget);
  }
  function handleCloseMenu() {
    setAnchorEl(null);
  }

  return (
    <Paper sx={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid var(--neutral-200)', bgcolor: 'white' }}>
      <Box sx={{ p: 3, bgcolor: '#fcfcfc', borderBottom: '1px solid var(--neutral-100)' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>
          قائمة المجموعات
        </Typography>
      </Box>

      <Table
        columns={[
          { id: 'id', label: '#' },
          { id: 'title', label: 'العنوان' },
          {
            id: 'language',
            label: 'اللغة',
            render: (g: ExamGroupRecord) => (
              <Chip
                label={g.language === 'ar' ? 'العربية' : g.language === 'tr' ? 'التركية' : 'الإنجليزية'}
                size="small"
              />
            ),
          },
          {
            id: 'is_active',
            label: 'الحالة',
            render: (g: ExamGroupRecord) => (g.is_active ? 'نشطة' : 'غير نشطة'),
          },
          {
            id: 'actions',
            label: '',
            align: 'right',
            render: (g: ExamGroupRecord) => (
              <IconButton onClick={(ev) => handleOpenMenu(ev as any, g)}>
                <MoreVert />
              </IconButton>
            ),
          },
        ]}
        data={groups}
        loading={loading}
        getRowId={(g) => g.id}
        sx={{
          '& .MuiTableCell-root': { py: 2, borderBottom: '1px solid var(--neutral-100)' },
          '& .MuiTableRow-root:hover': { bgcolor: '#f9f9f9' },
        }}
      />

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleCloseMenu}
        items={[
          {
            label: 'تعديل',
            onClick: () => {
              setEditOpen(true);
              handleCloseMenu();
            },
          },
          {
            label: 'حذف',
            tone: 'error',
            onClick: () => {
              setDeleteOpen(true);
              handleCloseMenu();
            },
          },
        ]}
      />

      <EditGroupModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        group={selected}
        onSaved={reload}
      />

      <DeleteGroupDialog
        open={deleteOpen}
        group={selected}
        onClose={() => setDeleteOpen(false)}
        onDeleted={reload}
      />
    </Paper>
  );
}
