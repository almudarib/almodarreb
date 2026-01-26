'use client';

import * as React from 'react';
import { Box, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { Search, MoreVert } from '@mui/icons-material';
import { Menu } from '@/components/ui/Menu';
import { Table } from '@/components/ui/Table';
import EditUserModal from './EditUserModal';
import DeleteUserDialog from './DeleteUserDialog';
import { useUsers } from './useUsers';
import type { UserKind, UserSummary } from '@/app/actions/users';

const ROLE_FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'admin', label: 'المدراء' },
  { key: 'sub_admin', label: 'الأدمن الفرعي' },
  { key: 'teacher', label: 'المعلمون' },
] as const;

export default function UsersTable() {
  const { users, loading, reload } = useUsers();
  const [roleFilter, setRoleFilter] = React.useState<UserKind | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [contextMenuAnchor, setContextMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = React.useState<null | UserSummary>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const visibleUsers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const match = (u: UserSummary) => {
      if (!q) return true;
      const nameMatch = u.name.toLowerCase().includes(q);
      const roleText =
        u.kind === 'admin'
          ? 'admin مدير ادمن مسؤول'
          : u.kind === 'sub_admin'
          ? 'sub_admin ادمن فرعي مسؤول فرعي'
          : 'teacher معلم معلّم أستاذ استاذ';
      const roleMatch = roleText.includes(q);
      return nameMatch || roleMatch;
    };
    return users
      .filter(u => roleFilter === 'all' || u.kind === roleFilter)
      .filter(match)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [users, roleFilter, searchQuery]);

  return (
    <Paper sx={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid var(--neutral-200)', bgcolor: 'white' }}>
      <Box sx={{ p: 3, bgcolor: '#fcfcfc', borderBottom: '1px solid var(--neutral-100)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Stack direction="row" spacing={1} sx={{ bgcolor: 'var(--neutral-100)', p: 0.5, borderRadius: '12px' }}>
              {ROLE_FILTERS.map((role) => (
                <Box
                  key={role.key}
                  onClick={() => setRoleFilter(role.key as any)}
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
              name="admin-search-by-name-only"
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
            render: (u) => (
              <Typography sx={{ fontWeight: 700, color: 'var(--brand-dark)', fontSize: '0.9rem' }}>
                {u.name}
              </Typography>
            )
          },
          {
            id: 'email',
            label: 'البريد الإلكتروني',
            render: (u) => (
              <Typography sx={{ color: 'var(--neutral-600)', fontSize: '0.85rem' }}>
                {u.email}
              </Typography>
            )
          },
          {
            id: 'kind',
            label: 'نوع الحساب',
            render: (u) => (
              <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.5, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, bgcolor: (u.kind === 'admin' || u.kind === 'sub_admin') ? 'var(--brand-dark)' : '#f0f0f0', color: (u.kind === 'admin' || u.kind === 'sub_admin') ? 'white' : '#555', textTransform: 'uppercase' }}>
                {u.kind === 'admin' ? 'ادمن' : u.kind === 'sub_admin' ? 'أدمن فرعي' : 'معلّم'}
              </Box>
            )
          },
          {
            id: 'actions',
            label: '',
            align: 'right',
            render: (u) => (
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
        getRowId={(u) => `${u.kind}-${u.id}`}
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
        items={[
          { label: 'تعديل البيانات', onClick: () => { if (selectedUser) { setEditOpen(true); setContextMenuAnchor(null); } } },
          { label: 'حذف الحساب', tone: 'error', onClick: () => { if (selectedUser) { setDeleteOpen(true); setContextMenuAnchor(null); } } },
        ]}
      />
      <EditUserModal
        open={editOpen}
        user={selectedUser}
        onClose={() => setEditOpen(false)}
        onSaved={reload}
        setMessage={setMessage}
        setError={setError}
      />
      <DeleteUserDialog
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
