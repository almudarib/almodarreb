'use client';

import * as React from 'react';
import { Box, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { Search, MoreVert } from '@mui/icons-material';
import { Menu } from '@/components/ui/Menu';
import type { MenuItemSpec } from '@/components/ui/Menu';
import { Table } from '@/components/ui/Table';
import SubAdminEditUserModal from './EditUserModal';
import SubAdminDeleteUserDialog from './DeleteUserDialog';
import { useSubAdminUsers } from './useUsers';
import type { UserSummary, UserKind } from '@/app/actions/users';

const ROLE_FILTERS = [
  { key: 'teacher', label: 'المعلمون' },
] as const;

export default function SubAdminUsersTable() {
  const { users, loading, reload } = useSubAdminUsers();
  const [roleFilter, setRoleFilter] = React.useState<UserKind>('teacher');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [contextMenuAnchor, setContextMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = React.useState<null | UserSummary>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // ضبط نوع القائمة المرئية لضمان توافق Table<T> مع UserSummary
  const visibleUsers: UserSummary[] = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const match = (u: UserSummary) => {
      if (!q) return true;
      const nameMatch = u.name.toLowerCase().includes(q);
      const roleText = 'teacher معلم معلّم أستاذ استاذ';
      const roleMatch = roleText.includes(q);
      return nameMatch || roleMatch;
    };
    return users
      .filter((u: UserSummary) => u.kind === 'teacher')
      .filter((u: UserSummary) => roleFilter === 'teacher')
      .filter(match)
      .sort((a: UserSummary, b: UserSummary) => a.name.localeCompare(b.name, 'ar'));
  }, [users, roleFilter, searchQuery]);

  const menuItems: MenuItemSpec[] = React.useMemo(() => {
    if (!selectedUser) return [];
    if (selectedUser.kind === 'teacher') {
      return [
        { label: 'تعديل البيانات', onClick: () => { setEditOpen(true); setContextMenuAnchor(null); } },
        { label: 'حذف الحساب', tone: 'error', onClick: () => { setDeleteOpen(true); setContextMenuAnchor(null); } },
      ];
    }
    // المسؤول الفرعي لا يرى إلا المعلمين؛ لا عناصر للأنواع الأخرى
    return [];
  }, [selectedUser]);

  return (
    <Paper sx={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid var(--neutral-200)', bgcolor: 'white' }}>
      <Box sx={{ p: 3, bgcolor: '#fcfcfc', borderBottom: '1px solid var(--neutral-100)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Stack direction="row" spacing={1} sx={{ bgcolor: 'var(--neutral-100)', p: 0.5, borderRadius: '12px' }}>
              {ROLE_FILTERS.map((role) => (
                <Box
                  key={role.key}
                  onClick={() => setRoleFilter(role.key as UserKind)}
                  sx={{
                    px: 2,
                    py: 0.8,
                    cursor: 'pointer',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    transition: '0.2s',
                    bgcolor: roleFilter === role.key ? 'white' : 'transparent',
                    color: roleFilter === role.key ? 'var(--brand-teal)' : 'var(--neutral-600)',
                    boxShadow: roleFilter === role.key ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    '&:hover': { color: 'var(--brand-teal)' }
                  }}
                >
                  {role.label}
                </Box>
              ))}
            </Stack>
          </Stack>
          <Box sx={{ width: { xs: '100%', md: '320px' } }}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              name="sub-admin-search-by-name-only"
              type="text"
              placeholder="ابحث بالاسم أو الدور فقط..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                if (val.includes('@')) return;
                setSearchQuery(val);
              }}
              autoComplete="off"
              inputProps={{ dir: 'rtl', style: { textAlign: 'right' }, autoComplete: 'off' }}
              InputProps={{
                startAdornment: <Search sx={{ color: 'var(--neutral-400)', mr: 1, ml: 0 }} />,
                sx: { borderRadius: '12px', bgcolor: 'white', '& fieldset': { borderColor: 'var(--neutral-200)' }, '&:hover fieldset': { borderColor: 'var(--brand-teal) !important' } }
              }}
            />
          </Box>
        </Stack>
      </Box>
      <Table
        columns={[
          {
            id: 'name',
            label: 'المستخدم',
            render: (u: UserSummary) => (
              <Typography sx={{ fontWeight: 700, color: 'var(--brand-dark)', fontSize: '0.9rem' }}>
                {u.name}
              </Typography>
            )
          },
          {
            id: 'email',
            label: 'البريد الإلكتروني',
            render: (u: UserSummary) => (
              <Typography sx={{ color: 'var(--neutral-600)', fontSize: '0.85rem' }}>
                {u.email}
              </Typography>
            )
          },
          {
            id: 'kind',
            label: 'نوع الحساب',
            render: (u: UserSummary) => (
              <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.5, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, bgcolor: (u.kind === 'sub_admin') ? 'var(--brand-dark)' : '#f0f0f0', color: (u.kind === 'sub_admin') ? 'white' : '#555', textTransform: 'uppercase' }}>
                {u.kind === 'sub_admin' ? 'أدمن فرعي' : 'معلّم'}
              </Box>
            )
          },
          {
            id: 'actions',
            label: '',
            align: 'right',
            render: (u: UserSummary) => (
              <IconButton
                onClick={(e) => { setContextMenuAnchor(e.currentTarget); setSelectedUser(u); }}
                sx={{ '&:hover': { bgcolor: 'var(--neutral-100)', color: 'var(--brand-teal)' } }}
              >
                <MoreVert />
              </IconButton>
            )
          },
        ]}
        data={visibleUsers}
        loading={loading}
        getRowId={(u) => `sub-admin-${u.kind}-${u.id}`}
        sx={{
          '& .MuiTableCell-root': { py: 2, borderBottom: '1px solid var(--neutral-100)' },
          '& .MuiTableRow-root:hover': { bgcolor: '#f9f9f9' }
        }}
      />
      <Menu
        anchorEl={contextMenuAnchor}
        open={!!contextMenuAnchor}
        onClose={() => setContextMenuAnchor(null)}
        PaperProps={{ sx: { boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: '12px', minWidth: 160, border: '1px solid var(--neutral-100)' } }}
        items={menuItems}
      />
      <SubAdminEditUserModal
        open={editOpen}
        user={selectedUser}
        onClose={() => setEditOpen(false)}
        onSaved={reload}
        setMessage={setMessage}
        setError={setError}
      />
      <SubAdminDeleteUserDialog
        open={deleteOpen}
        user={selectedUser}
        onClose={() => { setDeleteOpen(false); setSelectedUser(null); }}
        onDeleted={reload}
        setMessage={setMessage}
        setError={setError}
      />
    </Paper>
  );
}
