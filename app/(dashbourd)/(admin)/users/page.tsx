'use client';

import * as React from 'react';
import { Alert, Box, Container, FormControl, FormHelperText, IconButton, MenuItem, Select, Snackbar, Stack, Typography, Paper, Chip } from '@mui/material';
import { Input, Label, Card, CardHeader, CardContent, CardActions, Button, Dialog, Modal, Form, Menu, Table } from '@/components/ui';
import { MoreVert } from '@mui/icons-material';
import {
  createUser,
  listAllUsersSummary,
  listUsersByKind,
  getUserDetails,
  updateUser,
  deleteUserByKind,
  type CreateUserInput,
  type UserDetails,
  type UserSummary,
} from '@/app/actions/users';

// نوع الدور المستخدم في الواجهة
type UserKind = 'admin' | 'teacher';

// عنصر واجهة لإضافة مستخدم جديد (طالب/مسؤول/معلم)
function AddUserForm({
  onCreated,
  formId,
}: {
  onCreated: () => void;
  formId?: string;
}) {
  // حالة الحقول
  const [kind, setKind] = React.useState<UserKind | ''>('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  // لا توجد حقول خاصة بالطلاب بعد الإزالة

  // حالة الواجهة العامة
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successOpen, setSuccessOpen] = React.useState(false);

  // إزالة تحميل بيانات المعلمين الخاصة بإسناد الطالب

  // تحقق أساسي من صحة الإدخال قبل الإرسال
  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!kind) {
      errs.kind = 'نوع المستخدم مطلوب';
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'يرجى إدخال بريد إلكتروني صحيح';
    }
    if (!password || password.length < 6) {
      errs.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }
    if (!name.trim()) {
      errs.name = 'الاسم مطلوب';
    }
    // لا يوجد تحقق خاص بالطالب
    return errs;
  }

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // إرسال النموذج لإنشاء الطالب
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      return;
    }
    setSubmitting(true);
    let input: CreateUserInput;
    if (kind === 'admin') {
      input = {
        kind: 'admin',
        email,
        password,
        name,
      };
    } else {
      input = {
        kind: 'teacher',
        email,
        password,
        name,
      };
    }
    const res = await createUser(input);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // إعادة تعيين النموذج عند النجاح
    setKind('');
    setEmail('');
    setPassword('');
    setName('');
    // إزالة إعادة تعيين الحقول الخاصة بالطالب
    setSuccessOpen(true);
    onCreated();
  }

  return (
    <Card elevation={1}>
      <CardHeader title="إضافة مستخدم جديد" />
      <CardContent>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Form id={formId} onSubmit={handleSubmit}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <FormControl fullWidth error={!!fieldErrors.kind}>
              <Label id="kind-label">نوع المستخدم</Label>
              <Select
                labelId="kind-label"
                label="نوع المستخدم"
                value={kind}
                onChange={(e) => setKind(e.target.value as UserKind)}
                required
              >
                {/* تمت إزالة خيار الطالب */}
                <MenuItem value="teacher">معلّم</MenuItem>
                <MenuItem value="admin">مسؤول</MenuItem>
              </Select>
              {fieldErrors.kind && <FormHelperText>{fieldErrors.kind}</FormHelperText>}
            </FormControl>
          </Box>
          <Box>
            <Input
              label="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
            />
          </Box>
          <Box>
            <Input
              label="كلمة المرور"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              error={!!fieldErrors.password}
              helperText={fieldErrors.password}
            />
          </Box>
          <Box>
            <Input
              label="الاسم"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              error={!!fieldErrors.name}
              helperText={fieldErrors.name}
            />
          </Box>
          {/* تمت إزالة حقول الطالب بالكامل */}
          <Box sx={{ gridColumn: { xs: 'auto', md: '1 / -1' } }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button type="submit" variant="contained" loading={submitting} loadingText="جاري الحفظ...">
                حفظ
              </Button>
            </Stack>
          </Box>
        </Box>
      </Form>
      <Snackbar
        open={successOpen}
        autoHideDuration={4000}
        onClose={() => setSuccessOpen(false)}
        message="تم إنشاء المستخدم بنجاح"
      />
      </CardContent>
      <CardActions />
    </Card>
  );
}

// واجهة عرض/بحث/تصفية/ترتيب المستخدمين مع إجراءات CRUD
function UsersTable() {
  // الحالة العامة
  const [users, setUsers] = React.useState<Array<{ id: number; name: string; kind: UserKind; email: string; createdAt: string }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [roleFilter, setRoleFilter] = React.useState<UserKind | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name'>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  // قائمة الإجراءات لكل صف
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = React.useState<null | { id: number; name: string; kind: UserKind }>(null);

  // حوارات العرض والتعديل والحذف
  const [viewOpen, setViewOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedDetails, setSelectedDetails] = React.useState<UserDetails | null>(null);
  const [snackbarMsg, setSnackbarMsg] = React.useState<string | null>(null);

  // تحميل البيانات
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listAllUsersSummary();
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setUsers(res.users as Array<UserSummary>);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // تصفية وبحث وترتيب
  const visibleUsers = React.useMemo(() => {
    let data = users;
    if (roleFilter !== 'all') {
      data = data.filter((u) => u.kind === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      data = data.filter((u) => u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q));
    }
    data = [...data].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'ar');
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [users, roleFilter, searchQuery, sortDirection]);

  // فتح قائمة الإجراءات
  function openMenu(e: React.MouseEvent<HTMLButtonElement>, user: { id: number; name: string; kind: UserKind }) {
    setMenuAnchor(e.currentTarget);
    setMenuUser(user);
  }
  function closeMenu() {
    setMenuAnchor(null);
    setMenuUser(null);
  }

  // عرض التفاصيل
  async function handleView() {
    if (!menuUser) return;
    const res = await getUserDetails(menuUser.kind, menuUser.id);
    if (!res.ok) {
      setError(res.error);
      closeMenu();
      return;
    }
    setSelectedDetails(res.user);
    setViewOpen(true);
    closeMenu();
  }

  // فتح حوار التعديل
  async function handleEdit() {
    if (!menuUser) return;
    const res = await getUserDetails(menuUser.kind, menuUser.id);
    if (!res.ok) {
      setError(res.error);
      closeMenu();
      return;
    }
    setSelectedDetails(res.user);
    setEditOpen(true);
    closeMenu();
  }

  // تأكيد الحذف
  function handleAskDelete() {
    setDeleteOpen(true);
    closeMenu();
  }

  // تنفيذ الحذف
  async function handleConfirmDelete() {
    if (!menuUser) return;
    const res = await deleteUserByKind(menuUser.kind, menuUser.id);
    if (!res.ok) {
      setError(res.error);
      setDeleteOpen(false);
      return;
    }
    setSnackbarMsg('تم حذف المستخدم بنجاح');
    setDeleteOpen(false);
    await load();
  }

  // حفظ التعديلات
  async function handleSaveEdit() {
    if (!selectedDetails) return;
    const res = await updateUser({
      kind: selectedDetails.kind,
      id: selectedDetails.id,
      name: selectedDetails.name,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSnackbarMsg('تم حفظ التعديلات بنجاح');
    setEditOpen(false);
    setSelectedDetails(null);
    await load();
  }

  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">المستخدمون</Typography>
        <Stack direction="row" spacing={1}>
          <Chip
            label="الكل"
            color={roleFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setRoleFilter('all')}
          />
          <Chip
            label="مدير"
            color={roleFilter === 'admin' ? 'primary' : 'default'}
            onClick={() => setRoleFilter('admin')}
          />
          <Chip
            label="معلّم"
            color={roleFilter === 'teacher' ? 'primary' : 'default'}
            onClick={() => setRoleFilter('teacher')}
          />
          {/* تمت إزالة خيار طالب */}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Input
          fullWidth
          placeholder="ابحث بالاسم أو المعرّف"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Stack>

      <Table
        columns={[
          {
            id: 'name',
            label: 'الاسم',
            sortable: true,
          },
          {
            id: 'email',
            label: 'البريد الإلكتروني',
          },
          {
            id: 'kind',
            label: 'الدور',
            render: (u: { id: number; name: string; kind: UserKind }) =>
              u.kind === 'admin' ? 'مدير' : 'معلّم',
          },
          {
            id: 'createdAt',
            label: 'تاريخ التسجيل',
            render: (u: { createdAt?: string }) =>
              u.createdAt ? new Date(u.createdAt).toLocaleString('ar-EG') : '-',
          },
          {
            id: 'actions',
            label: 'إجراءات',
            align: 'right',
            render: (u: { id: number; name: string; kind: UserKind }) => (
              <IconButton onClick={(e) => openMenu(e, u)} aria-label="الإجراءات">
                <MoreVert />
              </IconButton>
            ),
          },
        ]}
        data={visibleUsers}
        loading={loading}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={(col, dir) => {
          if (col === 'name') {
            setSortBy('name');
            setSortDirection(dir);
          }
        }}
        getRowId={(u) => `${u.kind}-${u.id}`}
      />

      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        items={[
          { label: 'عرض', onClick: handleView },
          { label: 'تعديل', onClick: handleEdit },
          { label: 'حذف', onClick: handleAskDelete, tone: 'error' },
        ]}
      />

      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="تفاصيل المستخدم"
        actions={<Button onClick={() => setViewOpen(false)}>إغلاق</Button>}
        fullWidth
        maxWidth="sm"
      >
        {selectedDetails ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Input label="المعرّف" value={selectedDetails.id} InputProps={{ readOnly: true }} />
            <Input label="الاسم" value={selectedDetails.name} InputProps={{ readOnly: true }} />
            {/* تمت إزالة عرض تفاصيل الطالب */}
          </Stack>
        ) : (
          <Typography>لا توجد بيانات للعرض</Typography>
        )}
      </Dialog>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="تعديل المستخدم"
        onSubmit={handleSaveEdit}
        onCancel={() => setEditOpen(false)}
        submitText="حفظ"
        cancelText="إلغاء"
        fullWidth
        maxWidth="sm"
      >
        {selectedDetails ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Input
              label="الاسم"
              value={selectedDetails.name ?? ''}
              onChange={(e) => setSelectedDetails({ ...selectedDetails, name: e.target.value })}
              fullWidth
            />
            {/* تمت إزالة حقول تعديل الطالب */}
          </Stack>
        ) : (
          <Typography>لا توجد بيانات للتعديل</Typography>
        )}
      </Modal>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="تأكيد الحذف"
        actions={
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setDeleteOpen(false)}>إلغاء</Button>
            <Button variant="contained" color="error" onClick={handleConfirmDelete}>
              حذف
            </Button>
          </Stack>
        }
      >
        <Typography>هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع.</Typography>
      </Dialog>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg(null)}
        message={snackbarMsg ?? ''}
      />
    </Paper>
  );
}

// الصفحة الرئيسية: تضم نموذج إضافة الطالب وجدول المستخدمين
export default function AdminUsersPage() {
  // عند إنشاء طالب جديد، نقوم بتحديث الجدول عبر مفتاح إعادة التحميل
  const [reloadKey, setReloadKey] = React.useState(0);
  const [addOpen, setAddOpen] = React.useState(false);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">المستخدمون</Typography>
        <Button variant="contained" onClick={() => setAddOpen(true)}>
          إضافة مستخدم جديد
        </Button>
      </Stack>
      <UsersTable key={reloadKey} />
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة مستخدم جديد"
        submitText="إضافة"
        cancelText="إلغاء"
        onSubmit={() => {
          const form = document.getElementById('add-user-form') as HTMLFormElement | null;
          if (form && typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else if (form) {
            const evt = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(evt);
          }
        }}
        onCancel={() => setAddOpen(false)}
        fullWidth
        maxWidth="md"
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
