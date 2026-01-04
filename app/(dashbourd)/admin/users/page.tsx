'use client';

import * as React from 'react';
import { 
  Alert, Box, Container, FormControl, FormHelperText, IconButton, 
  MenuItem, Select, Snackbar, Stack, Typography, Paper, Chip, Divider 
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/Dialog';
import { Modal } from '@/components/ui/Modal';
import { Form } from '@/components/ui/Form';
import { Menu } from '@/components/ui/Menu';
import { Table } from '@/components/ui/Table';
import { MoreVert, PersonAddAlt1, FilterList, Search } from '@mui/icons-material';
import {
  createUser,
  listAllUsersSummary,
  getUserDetails,
  updateUser,
  deleteUserByKind,
  type CreateUserInput,
  type UserDetails,
  type UserSummary,
} from '@/app/actions/users';
 

type UserKind = 'admin' | 'teacher';

// --- مكون إضافة مستخدم جديد ---
function AddUserForm({ onCreated, formId }: { onCreated: () => void; formId?: string; }) {
  const [kind, setKind] = React.useState<UserKind | ''>('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [defaultFee, setDefaultFee] = React.useState('20');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    let input: CreateUserInput = kind === 'admin' 
      ? { kind, email, password, name } 
      : { kind: 'teacher', email, password, name, per_student_fee: Number(defaultFee) };

    const res = await createUser(input);
    setSubmitting(false);
    if (!res.ok) { setError(res.error); return; }
    onCreated();
  }

  return (
    <Box sx={{ p: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{error}</Alert>}
      <Form id={formId} onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth error={!!fieldErrors.kind}>
              <Label sx={{ mb: 1, fontWeight: 600 }}>نوع المستخدم</Label>
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value as UserKind)}
                sx={{ borderRadius: '10px', bgcolor: 'var(--brand-white)' }}
                displayEmpty
              >
                <MenuItem value="" disabled>اختر النوع...</MenuItem>
                <MenuItem value="teacher">معلّم (Teacher)</MenuItem>
                <MenuItem value="admin">مسؤول (Admin)</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Label sx={{ mb: 1, fontWeight: 600 }}>الاسم الكامل</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل الاسم الثلاثي"
                className="focus:ring-[var(--brand-teal)] border-[var(--neutral-200)]"
              />
            </Box>

            <Box>
              <Label sx={{ mb: 1, fontWeight: 600 }}>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
              />
            </Box>

            <Box>
              <Label sx={{ mb: 1, fontWeight: 600 }}>كلمة المرور</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
              />
            </Box>

            {kind === 'teacher' && (
              <Box>
                <Label sx={{ mb: 1, fontWeight: 600 }}>القيمة لكل طالب (USD)</Label>
                <Input
                  type="number"
                  value={defaultFee}
                  onChange={(e) => setDefaultFee(e.target.value)}
                />
              </Box>
            )}
          </Box>
        </Stack>
      </Form>
    </Box>
  );
}

// --- جدول المستخدمين ---
function UsersTable() {
  const [users, setUsers] = React.useState<UserSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [roleFilter, setRoleFilter] = React.useState<UserKind | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = React.useState<null | UserSummary>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selectedDetails, setSelectedDetails] = React.useState<UserDetails | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listAllUsersSummary();
    if (res.ok) setUsers(res.users);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const visibleUsers = React.useMemo(() => {
    return users
      .filter(u => roleFilter === 'all' || u.kind === roleFilter)
      .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [users, roleFilter, searchQuery]);

  return (
    <Paper sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px var(--black-03)', border: '1px solid var(--neutral-300)' }}>
      {/* Table Header / Filters */}
      <Box sx={{ p: 3, borderBottom: '1px solid var(--neutral-200)', bgcolor: 'var(--brand-white)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterList sx={{ color: 'var(--brand-teal)' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>تصفية:</Typography>
            {['all', 'admin', 'teacher'].map((role) => (
              <Chip
                key={role}
                label={role === 'all' ? 'الكل' : role === 'admin' ? 'المدراء' : 'المعلمون'}
                onClick={() => setRoleFilter(role as any)}
                sx={{
                  fontWeight: 600,
                  bgcolor: roleFilter === role ? 'var(--brand-teal)' : 'transparent',
                  color: roleFilter === role ? 'var(--brand-white)' : 'var(--brand-dark)',
                  border: `${'1px solid '}${roleFilter === role ? 'var(--brand-teal)' : 'var(--neutral-400)'}`,
                  '&:hover': { bgcolor: roleFilter === role ? 'var(--brand-teal)' : 'var(--neutral-100)' }
                }}
              />
            ))}
          </Stack>
          
          <Box sx={{ position: 'relative', width: { xs: '100%', md: '300px' } }}>
            <Search sx={{ position: 'absolute', right: 12, top: 10, color: 'var(--neutral-500)' }} />
            <Input
              placeholder="ابحث عن اسم أو بريد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 border-[var(--neutral-200)] focus:border-[var(--brand-teal)] rounded-full"
            />
          </Box>
        </Stack>
      </Box>

      {/* The Table */}
      <Table
        columns={[
          {
            id: 'name',
            label: 'المستخدم',
            render: (u) => (
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: u.kind === 'admin' ? 'var(--brand-gold-13)' : 'var(--brand-teal-13)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: u.kind === 'admin' ? 'var(--brand-gold)' : 'var(--brand-teal)' }}>
                  {u.name.charAt(0)}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: 'var(--brand-dark)', fontSize: '0.95rem' }}>{u.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--neutral-600)' }}>ID: #{u.id}</Typography>
                </Box>
              </Stack>
            )
          },
          { id: 'email', label: 'البريد الإلكتروني' },
          {
            id: 'kind',
            label: 'الدور',
            render: (u) => (
              <Chip 
                label={u.kind === 'admin' ? 'مدير' : 'معلّم'} 
                size="small"
                sx={{ 
                  bgcolor: u.kind === 'admin' ? 'var(--brand-dark)' : 'var(--neutral-200)', 
                  color: u.kind === 'admin' ? 'var(--brand-white)' : 'var(--brand-dark)',
                  fontWeight: 700 
                }} 
              />
            )
          },
          {
            id: 'actions',
            label: '',
            align: 'right',
            render: (u) => (
              <IconButton onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuUser(u); }}>
                <MoreVert />
              </IconButton>
            )
          },
        ]}
        data={visibleUsers}
        loading={loading}
        getRowId={(u) => `${u.kind}-${u.id}`}
      />

      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        items={[
          { label: 'تعديل البيانات', onClick: () => { setEditOpen(true); setMenuAnchor(null); } },
          { label: 'حذف الحساب', onClick: () => { /* Logic delete */ }, tone: 'error' },
        ]}
      />
    </Paper>
  );
}

// --- الصفحة الرئيسية للمستخدمين ---
export default function AdminUsersPage() {
  const [reloadKey, setReloadKey] = React.useState(0);
  const [addOpen, setAddOpen] = React.useState(false);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      {/* Header Section */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>إدارة المستخدمين</Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>إضافة وتعديل صلاحيات المعلمين والمدراء</Typography>
        </Box>
        <Button 
          variant="contained" 
          onClick={() => setAddOpen(true)}
          sx={{ 
            bgcolor: 'var(--brand-teal)', 
            px: 3, py: 1.2, 
            borderRadius: '10px',
            '&:hover': { bgcolor: 'var(--brand-teal-hover)' },
            boxShadow: '0 4px 14px var(--teal-shadow-30)'
          }}
          startIcon={<PersonAddAlt1 sx={{ ml: 1 }} />}
        >
          مستخدم جديد
        </Button>
      </Stack>

      <UsersTable key={reloadKey} />

      {/* Modal إضافة مستخدم */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إنشاء حساب جديد"
        submitText="تأكيد الإضافة"
        cancelText="إلغاء"
        onSubmit={() => {
          document.getElementById('add-user-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }}
        fullWidth
        maxWidth="sm"
      >
        <AddUserForm
          formId="add-user-form"
          onCreated={() => {
            setAddOpen(false);
            setReloadKey((k) => k + 1);
          }}
        />
      </Modal>
    </Container>
  );
}
