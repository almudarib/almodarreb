'use client';

import * as React from 'react';
import { 
  Alert, Box, Container, FormControl, FormHelperText, IconButton, 
  MenuItem, Select, Snackbar, Stack, Typography, Paper, Chip, Divider, TextField 
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/Dialog';
import { Modal } from '@/components/ui/Modal';
import { DeleteWarning } from '@/components/ui/DeleteWarning';
import { Form } from '@/components/ui/Form';
import { Menu } from '@/components/ui/Menu';
import { Table } from '@/components/ui/Table';
import { MoreVert, PersonAddAlt1, FilterList, Search, PeopleAltRounded } from '@mui/icons-material';
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
  <Stack spacing={4} sx={{ p: 1 }}>
    {/* عنوان فرعي للنموذج لزيادة الوضوح */}
    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: -2, fontWeight: 500, textAlign: 'right', direction: 'rtl' }}>
      الرجاء إدخال بيانات الحساب الجديدة بدقة
    </Typography>

    <Box 
      sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
        gap: 3 
      }}
    >
      {/* نوع المستخدم - مع خلفية خفيفة لتمييزه كحقل أساسي */}
      <FormControl fullWidth error={!!fieldErrors.kind} sx={{ gridColumn: { md: '1 / span 2' } }}>
        <Label sx={{ mb: 5, fontWeight: 700, color: 'var(--brand-dark)', display: 'flex', alignItems: 'center', gap: 1, flexDirection: 'row-reverse' }}>
          <PeopleAltRounded sx={{ fontSize: 20, color: 'var(--brand-teal)' }} />
          نوع المستخدم
        </Label>
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value as UserKind)}
          sx={{ 
            borderRadius: '12px', 
            bgcolor: '#f8fafc', 
            '& .MuiOutlinedInput-notchedOutline': { border: '1px solid #e2e8f0' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--brand-teal)' },
            direction: 'rtl',
          }}
          MenuProps={{ PaperProps: { sx: { direction: 'rtl' } } }}
          displayEmpty
        >
          <MenuItem value="teacher">معلّم </MenuItem>
          <MenuItem value="admin">مسؤول </MenuItem>
        </Select>
      </FormControl>

      {/* الاسم الكامل */}
      <Box>
        <Label sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          الاسم الكامل
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="أدخل الاسم الثلاثي"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[var(--brand-teal)] focus:border-transparent transition-all outline-none"
          inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
        />
      </Box>

      {/* البريد الإلكتروني */}
      <Box>
        <Label sx={{ mb: 1, fontWeight: 600 }}>البريد الإلكتروني</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@mail.com"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[var(--brand-teal)] transition-all outline-none"
           inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
        />
      </Box>

      {/* كلمة المرور */}
      <Box>
        <Label sx={{ mb: 1, fontWeight: 600 }}>كلمة المرور</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="******"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[var(--brand-teal)] transition-all outline-none"
          inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
        />
      </Box>

      {/* الحقل الشرطي للمدرس - مع حركة دخول (Fade In) */}
      {kind === 'teacher' && (
        <Box 
          sx={{ 
            animation: 'fadeIn 0.4s ease-out',
            bgcolor: 'var(--brand-teal-5)', // لون خلفية خفيف جداً للتنبيه
            p: 2,
            borderRadius: '12px',
            border: '1px dashed var(--brand-teal)',
            gridColumn: { md: 'span 1' }
          }}
        >
          <Label sx={{ mb: 1, fontWeight: 700, color: 'var(--brand-teal)' }}>القيمة لكل طالب بالدولار</Label>
          <Input
            type="number"
            value={defaultFee}
            onChange={(e) => setDefaultFee(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border-none bg-white shadow-sm outline-none focus:ring-2 focus:ring-[var(--brand-teal)]"
            placeholder="0.00"
            inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
          />
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
            سيتم احتساب هذه القيمة تلقائياً عند تسجيل طلاب جدد مع هذا المعلم.
          </Typography>
        </Box>
      )}
    </Box>

    {/* CSS Animation */}
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}} />
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
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = React.useState<UserSummary | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editPassword, setEditPassword] = React.useState('');
  const [editKind, setEditKind] = React.useState<UserKind>('teacher');
  const [editSubmitting, setEditSubmitting] = React.useState(false);
  const [editMessage, setEditMessage] = React.useState<string | null>(null);
  const [editError, setEditError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listAllUsersSummary();
    if (res.ok) setUsers(res.users);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const visibleUsers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const match = (u: UserSummary) => {
      if (!q) return true;
      const nameMatch = u.name.toLowerCase().includes(q);
      const roleText = u.kind === 'admin'
        ? 'admin مدير ادمن مسؤول'
        : 'teacher معلم معلّم أستاذ استاذ';
      const roleMatch = roleText.includes(q);
      return nameMatch || roleMatch;
    };
    return users
      .filter(u => roleFilter === 'all' || u.kind === roleFilter)
      .filter(match)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [users, roleFilter, searchQuery]);

  async function openEdit(u: UserSummary) {
    setMenuAnchor(null);
    const res = await getUserDetails(u.kind, u.id);
    if (!res.ok) return;
    setSelectedDetails(res.user);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPassword('');
    setEditKind(u.kind);
    setEditOpen(true);
  }

  return (
    <Paper sx={{ 
      borderRadius: '20px', 
      overflow: 'hidden', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
      border: '1px solid var(--neutral-200)',
      bgcolor: 'white'
    }}>
      {/* شريط الأدوات العلوي */}
      <Box sx={{ p: 3, bgcolor: '#fcfcfc', borderBottom: '1px solid var(--neutral-100)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
          
          {/* قسم الفلترة */}
          <Stack direction="row" spacing={1} alignItems="center">

            <Stack direction="row" spacing={1} sx={{ bgcolor: 'var(--neutral-100)', p: 0.5, borderRadius: '12px' }}>
              {['all', 'admin', 'teacher'].map((role) => (
                <Box
                  key={role}
                  onClick={() => setRoleFilter(role as any)}
                  sx={{
                    px: 2,
                    py: 0.8,
                    cursor: 'pointer',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    transition: '0.2s',
                    bgcolor: roleFilter === role ? 'white' : 'transparent',
                    color: roleFilter === role ? 'var(--brand-teal)' : 'var(--neutral-600)',
                    boxShadow: roleFilter === role ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    '&:hover': { color: 'var(--brand-teal)' }
                  }}
                >
                  {role === 'all' ? 'الكل' : role === 'admin' ? 'المدراء' : 'المعلمون'}
                </Box>
              ))}
            </Stack>
          </Stack>
          
          {/* محرك البحث */}
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
                sx: { 
                  borderRadius: '12px', 
                  bgcolor: 'white',
                  '& fieldset': { borderColor: 'var(--neutral-200)' },
                  '&:hover fieldset': { borderColor: 'var(--brand-teal) !important' }
                }
              }}
            />
          </Box>
        </Stack>
      </Box>

      {/* الجدول */}
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
              <Box sx={{ 
                display: 'inline-flex',
                px: 1.5, 
                py: 0.5, 
                borderRadius: '6px', 
                fontSize: '0.75rem',
                fontWeight: 800,
                bgcolor: u.kind === 'admin' ? 'var(--brand-dark)' : '#f0f0f0', 
                color: u.kind === 'admin' ? 'white' : '#555',
                textTransform: 'uppercase'
              }}>
                {u.kind === 'admin' ? 'ادمن' : 'معلّم'}
              </Box>
            )
          },
          {
            id: 'actions',
            label: '',
            align: 'right',
            render: (u) => (
              <IconButton 
                onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuUser(u); }}
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
        // إضافة تنسيق لصفوف الجدول (اختياري)
        sx={{
          '& .MuiTableCell-root': { py: 2, borderBottom: '1px solid var(--neutral-100)' },
          '& .MuiTableRow-root:hover': { bgcolor: '#f9f9f9' }
        }}
      />

      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          sx: { 
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
            borderRadius: '12px',
            minWidth: 160,
            border: '1px solid var(--neutral-100)'
          }
        }}
        items={[
          { label: 'تعديل البيانات', onClick: () => { if (menuUser) openEdit(menuUser); } },
          { 
            label: 'حذف الحساب', 
            onClick: async () => { 
              if (!menuUser) return;
              setMenuAnchor(null);
              setPendingDeleteUser(menuUser);
              setDeleteOpen(true);
            }, 
            tone: 'error' 
          },
        ]}
      />

      {/* نافذة تعديل المستخدم */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onCancel={() => setEditOpen(false)}
        title="تعديل المستخدم"
        submitText={editSubmitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
        onSubmit={async () => {
          if (!selectedDetails) return;
          setEditSubmitting(true);
          setEditError(null);
          const res = await updateUser({
            id: selectedDetails.id,
            kind: editKind,
            name: editName,
            email: editEmail,
            password: editPassword || undefined,
          });
          setEditSubmitting(false);
          if (res.ok) {
            setEditOpen(false);
            setEditMessage('تم حفظ التعديلات بنجاح');
            load();
          } else {
            setEditError(res.error ?? 'فشلت عملية التعديل');
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <Box sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Label>الاسم الكامل</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
            />
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
            />
            <Label>كلمة المرور (اختياري)</Label>
            <Input
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="اتركها فارغة إن لم ترغب بالتغيير"
              inputProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
            />
            <Label>نوع المستخدم</Label>
            <Select
              value={editKind}
              onChange={(e) => setEditKind(e.target.value as UserKind)}
              sx={{ borderRadius: '12px', direction: 'rtl' }}
              displayEmpty
            >
              <MenuItem value="teacher">معلّم</MenuItem>
              <MenuItem value="admin">ادمن</MenuItem>
            </Select>
          </Stack>
        </Box>
      </Modal>
      <DeleteWarning
        open={deleteOpen}
        title={pendingDeleteUser?.kind === 'teacher' ? 'تأكيد حذف المعلم' : 'تأكيد حذف المسؤول'}
        entityName={pendingDeleteUser?.name}
        description={pendingDeleteUser?.kind === 'teacher' ? 'سيتم حذف هذا المعلم وكل بياناته نهائيًا.' : 'سيتم حذف هذا المسؤول نهائيًا ولا يمكن التراجع.'}
        impacts={
          pendingDeleteUser?.kind === 'teacher'
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
          if (!pendingDeleteUser) return;
          setDeleteOpen(false);
          const res = await deleteUserByKind(pendingDeleteUser.kind, pendingDeleteUser.id);
          if (res.ok) {
            setEditMessage(
              pendingDeleteUser.kind === 'teacher'
                ? 'تم حذف المعلم وكل طلابه بنجاح'
                : 'تم حذف المسؤول بنجاح'
            );
            setPendingDeleteUser(null);
            load();
          } else {
            setEditError(
              pendingDeleteUser.kind === 'teacher'
                ? (res.error ?? 'فشل حذف المعلم')
                : (res.error ?? 'فشل حذف المسؤول')
            );
            setPendingDeleteUser(null);
          }
        }}
        onCancel={() => { setDeleteOpen(false); setPendingDeleteUser(null); }}
      />
      <Snackbar open={!!editMessage} autoHideDuration={4000} onClose={() => setEditMessage(null)}>
        <Alert severity="success" variant="filled">{editMessage}</Alert>
      </Snackbar>
      <Snackbar open={!!editError} autoHideDuration={5000} onClose={() => setEditError(null)}>
        <Alert severity="error" variant="filled">{editError}</Alert>
      </Snackbar>
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
        onCancel={() => setAddOpen(false)}
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
