'use client';

import * as React from 'react';
import { Alert, Box, Container, FormControl, FormHelperText, IconButton, MenuItem, Select, Snackbar, Stack, Typography, Paper, Chip } from '@mui/material';
import { Input, Label, Card, CardHeader, CardContent, CardActions, Button, Checkbox, Dialog, Modal, Form, Menu, Table } from '@/components/ui';
import { MoreVert } from '@mui/icons-material';
import {
  createUser,
  listAllUsersWithKind,
  listUsersByKind,
  getUserDetails,
  updateUser,
  deleteUserByKind,
  type CreateUserInput,
  type UserDetails,
} from '@/app/actions/users';

// نوع الدور المستخدم في الواجهة
type UserKind = 'admin' | 'teacher' | 'student';

// عنصر واجهة لإضافة مستخدم جديد (طالب/مسؤول/معلم)
function AddUserForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  // حالة الحقول
  const [kind, setKind] = React.useState<UserKind | ''>('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [nationalId, setNationalId] = React.useState('');
  const [language, setLanguage] = React.useState<'ar' | 'en' | ''>('');
  const [teacherId, setTeacherId] = React.useState<number | ''>('');
  const [showExams, setShowExams] = React.useState(true);
  const [examDatetime, setExamDatetime] = React.useState<string>('');
  const [startDate, setStartDate] = React.useState<string>('');
  const [notes, setNotes] = React.useState('');

  // حالة المعلمين المحمّلة من النظام
  const [teachers, setTeachers] = React.useState<Array<{ id: number; name: string }>>([]);
  const [loadingTeachers, setLoadingTeachers] = React.useState(false);

  // حالة الواجهة العامة
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successOpen, setSuccessOpen] = React.useState(false);

  // تحميل قائمة المعلمين
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingTeachers(true);
      const res = await listUsersByKind('teacher');
      if (mounted) {
        if (res.ok) {
          setTeachers(res.users.map((u) => ({ id: u.id, name: u.name })));
        } else {
          setError(res.error);
        }
        setLoadingTeachers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
    if (kind === 'student') {
      if (!nationalId.trim() || !/^\d{6,20}$/.test(nationalId)) {
        errs.nationalId = 'الرقم القومي يجب أن يكون أرقامًا بين 6 و20';
      }
      if (!language) {
        errs.language = 'اللغة مطلوبة';
      }
      if (!teacherId) {
        errs.teacherId = 'يجب اختيار المدرّس';
      }
    }
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
    if (kind === 'student') {
      input = {
        kind: 'student',
        email,
        password,
        name,
        nationalId,
        language,
        teacherId: teacherId as number,
        showExams,
        examDatetime: examDatetime ? examDatetime : null,
        startDate: startDate ? startDate : null,
        notes: notes ? notes : null,
      };
    } else if (kind === 'admin') {
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
    setNationalId('');
    setLanguage('');
    setTeacherId('');
    setShowExams(true);
    setExamDatetime('');
    setStartDate('');
    setNotes('');
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
      <Form onSubmit={handleSubmit}>
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
                <MenuItem value="student">طالب</MenuItem>
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
          {kind === 'student' && (
            <Box>
              <Input
                label="الرقم القومي"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                required
                fullWidth
                error={!!fieldErrors.nationalId}
                helperText={fieldErrors.nationalId}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Box>
          )}
          {kind === 'student' && (
            <Box>
              <FormControl fullWidth error={!!fieldErrors.language}>
                <Label id="language-label">اللغة</Label>
                <Select
                  labelId="language-label"
                  label="اللغة"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'ar' | 'en' | '')}
                  required
                >
                  <MenuItem value="ar">العربية</MenuItem>
                  <MenuItem value="en">الإنجليزية</MenuItem>
                </Select>
                {fieldErrors.language && <FormHelperText>{fieldErrors.language}</FormHelperText>}
              </FormControl>
            </Box>
          )}
          {kind === 'student' && (
            <Box>
              <FormControl fullWidth error={!!fieldErrors.teacherId}>
                <Label id="teacher-label">المعلّم</Label>
                <Select
                  labelId="teacher-label"
                  label="المعلّم"
                  value={teacherId}
                  onChange={(e) => setTeacherId(Number(e.target.value))}
                  required
                >
                  {loadingTeachers ? (
                    <MenuItem value="">
                      <em>جاري التحميل...</em>
                    </MenuItem>
                  ) : (
                    teachers.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {fieldErrors.teacherId && <FormHelperText>{fieldErrors.teacherId}</FormHelperText>}
              </FormControl>
            </Box>
          )}
          {kind === 'student' && (
            <Box>
              <Input
                label="موعد الامتحان"
                type="datetime-local"
                value={examDatetime}
                onChange={(e) => setExamDatetime(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
          {kind === 'student' && (
            <Box>
              <Input
                label="تاريخ البدء"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
          {kind === 'student' && (
            <Box sx={{ gridColumn: { xs: 'auto', md: '1 / -1' } }}>
              <Input
                label="ملاحظات"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                multiline
                minRows={3}
              />
            </Box>
          )}
          {kind === 'student' && (
            <Box sx={{ gridColumn: { xs: 'auto', md: '1 / -1' } }}>
              <Checkbox
                checked={showExams}
                onChange={(e) => setShowExams(e.target.checked)}
                label="السماح بعرض الامتحانات"
              />
            </Box>
          )}
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
  const [users, setUsers] = React.useState<Array<{ id: number; name: string; kind: UserKind }>>([]);
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
    const res = await listAllUsersWithKind();
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setUsers(res.users);
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
      data = data.filter((u) => u.name.toLowerCase().includes(q) || String(u.id).includes(q));
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
    if (selectedDetails.kind === 'student') {
      const res = await updateUser({
        kind: 'student',
        id: selectedDetails.id,
        name: selectedDetails.name,
        nationalId: selectedDetails.national_id,
        language: selectedDetails.language,
        examDatetime: selectedDetails.exam_datetime ?? null,
        startDate: selectedDetails.start_date ?? null,
        notes: selectedDetails.notes ?? null,
        showExams: selectedDetails.show_exams,
        teacherId: selectedDetails.teacher_id,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
    } else {
      const res = await updateUser({
        kind: selectedDetails.kind,
        id: selectedDetails.id,
        name: selectedDetails.name,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
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
          <Chip
            label="طالب"
            color={roleFilter === 'student' ? 'primary' : 'default'}
            onClick={() => setRoleFilter('student')}
          />
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
          { id: 'id', label: 'المعرّف' },
          {
            id: 'name',
            label: 'الاسم',
            sortable: true,
          },
          {
            id: 'kind',
            label: 'الدور',
            render: (u: { id: number; name: string; kind: UserKind }) =>
              u.kind === 'admin' ? 'مدير' : u.kind === 'teacher' ? 'معلّم' : 'طالب',
          },
          {
            id: 'actions',
            label: 'إجراءات',
            align: 'right',
            render: (u: { id: number; name: string; kind: UserKind }) => (
              <IconButton onClick={(e) => openMenu(e as any, u)} aria-label="الإجراءات">
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
            {selectedDetails.kind === 'student' ? (
              <>
                <Input label="الرقم القومي" value={selectedDetails.national_id ?? ''} InputProps={{ readOnly: true }} />
                <Input label="اللغة" value={selectedDetails.language ?? ''} InputProps={{ readOnly: true }} />
                <Input label="موعد الامتحان" value={selectedDetails.exam_datetime ?? ''} InputProps={{ readOnly: true }} />
                <Input label="تاريخ البدء" value={selectedDetails.start_date ?? ''} InputProps={{ readOnly: true }} />
                <Input label="ملاحظات" value={selectedDetails.notes ?? ''} InputProps={{ readOnly: true }} />
                <Input label="عرض الامتحانات" value={selectedDetails.show_exams ? 'نعم' : 'لا'} InputProps={{ readOnly: true }} />
                <Input label="المعلّم" value={selectedDetails.teacher_id ?? ''} InputProps={{ readOnly: true }} />
              </>
            ) : null}
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
            {selectedDetails.kind === 'student' ? (
              <>
                <Input
                  label="الرقم القومي"
                  value={selectedDetails.national_id ?? ''}
                  onChange={(e) => setSelectedDetails({ ...selectedDetails, national_id: e.target.value })}
                  fullWidth
                />
                <FormControl fullWidth>
                  <Label id="edit-language-label">اللغة</Label>
                  <Select
                    labelId="edit-language-label"
                    label="اللغة"
                    value={selectedDetails.language ?? ''}
                    onChange={(e) => setSelectedDetails({ ...selectedDetails, language: e.target.value })}
                  >
                    <MenuItem value="ar">العربية</MenuItem>
                    <MenuItem value="en">الإنجليزية</MenuItem>
                  </Select>
                </FormControl>
                <Input
                  label="موعد الامتحان"
                  type="datetime-local"
                  value={selectedDetails.exam_datetime ?? ''}
                  onChange={(e) => setSelectedDetails({ ...selectedDetails, exam_datetime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <Input
                  label="تاريخ البدء"
                  type="date"
                  value={selectedDetails.start_date ?? ''}
                  onChange={(e) => setSelectedDetails({ ...selectedDetails, start_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <Input
                  label="ملاحظات"
                  value={selectedDetails.notes ?? ''}
                  onChange={(e) => setSelectedDetails({ ...selectedDetails, notes: e.target.value })}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <Checkbox
                  checked={!!selectedDetails.show_exams}
                  onChange={(e) => setSelectedDetails({ ...selectedDetails, show_exams: e.target.checked })}
                  label="السماح بعرض الامتحانات"
                />
                <Input
                  label="المعلّم (ID)"
                  value={selectedDetails.teacher_id ?? ''}
                  onChange={(e) =>
                    setSelectedDetails({
                      ...selectedDetails,
                      teacher_id: Number(e.target.value) || selectedDetails.teacher_id,
                    })
                  }
                  fullWidth
                />
              </>
            ) : null}
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

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        إدارة المستخدمين وإضافة الطلاب
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
          gap: 3,
        }}
      >
        <Box>
          <AddUserForm onCreated={() => setReloadKey((k) => k + 1)} />
        </Box>
        <Box>
          {/* إعادة تركيب UsersTable عند التحديث لضمان التحميل */}
          <UsersTable key={reloadKey} />
        </Box>
      </Box>
    </Container>
  );
}
