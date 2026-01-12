'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Container,
  MenuItem,
  Snackbar,
  Stack,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import { Input, Card, CardHeader, CardContent, CardActions, Button, Modal, Form, Table, Menu, DeleteWarning } from '@/components/ui';
import { type ExamRecord, createExam, listExams, type ListExamsQuery, updateExam, deleteExam } from '@/app/actions/exam';
import { Search, MoreVert, EditOutlined, DeleteOutline, LanguageRounded } from '@mui/icons-material';

function AddExamForm({
  onCreated,
  formId,
}: {
  onCreated: () => void;
  formId?: string;
}) {
  const [title, setTitle] = React.useState('');
  const [language, setLanguage] = React.useState<'ar' | 'en' | 'tr' | ''>('');
  const [duration, setDuration] = React.useState<number | ''>('');
  const [isActive, setIsActive] = React.useState(true);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [successOpen, setSuccessOpen] = React.useState(false);

  function validate() {
    const errs: Record<string, string> = {};
    if (!String(title).trim()) errs.title = 'العنوان مطلوب';
    if (!language) errs.language = 'اللغة مطلوبة';
    const dur = typeof duration === 'string' ? Number(duration) : duration;
    if (!Number.isInteger(dur) || (dur as number) <= 0) errs.duration = 'المدة يجب أن تكون عددًا صحيحًا موجبًا';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await createExam({
        title: title.trim(),
        language,
        duration_minutes: Number(duration),
        is_active: isActive,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccessOpen(true);
      setTitle('');
      setLanguage('');
      setDuration('');
      setIsActive(true);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card elevation={0}>
      <CardHeader title="إضافة امتحان جديد" />
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
              <Input
                label="عنوان الامتحان"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                fullWidth
                error={!!fieldErrors.title}
                helperText={fieldErrors.title}
              />
            </Box>
            <Box>
              <Input
                label="اللغة"
                select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'ar' | 'en' | 'tr')}
                required
                fullWidth
                error={!!fieldErrors.language}
                helperText={fieldErrors.language}
              >
                <MenuItem value="ar">العربية</MenuItem>
                <MenuItem value="en">الإنجليزية</MenuItem>
                <MenuItem value="tr">التركية</MenuItem>
              </Input>
            </Box>
            <Box>
              <Input
                label="مدة الامتحان (بالدقائق)"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
                required
                fullWidth
                error={!!fieldErrors.duration}
                helperText={fieldErrors.duration}
              />
            </Box>
            <Box>
              <Input
                label="حالة الامتحان"
                select
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive((e.target.value as string) === 'active')}
                fullWidth
              >
                <MenuItem value="active">نشط</MenuItem>
                <MenuItem value="inactive">غير نشط</MenuItem>
              </Input>
            </Box>
          </Box>
          <CardActions sx={{ mt: 2, justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" loading={submitting}>
              حفظ
            </Button>
          </CardActions>
        </Form>
        <Snackbar
          open={successOpen}
          autoHideDuration={3000}
          onClose={() => setSuccessOpen(false)}
          message="تم إنشاء الامتحان بنجاح"
        />
      </CardContent>
    </Card>
  );
}

function ExamsTable() {
  const [exams, setExams] = React.useState<ExamRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [languageFilter, setLanguageFilter] = React.useState<'all' | 'ar' | 'en' | 'tr'>('all');
  const [sortBy, setSortBy] = React.useState<'created_at' | 'title'>('created_at');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const page = 1;
  const perPage = 20;

  const [reloadKey, setReloadKey] = React.useState(0);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selected, setSelected] = React.useState<ExamRecord | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q: ListExamsQuery = {
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery ? searchQuery : undefined,
        sort_by: sortBy,
        sort_dir: sortDirection,
        page,
        per_page: perPage,
      };
      const res = await listExams(q);
      if (!res.ok) {
        setError(res.error);
        setExams([]);
        return;
      }
      setExams(res.exams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [languageFilter, searchQuery, sortBy, sortDirection, page, perPage]);

  React.useEffect(() => {
    load();
  }, [load, reloadKey]);

  function handleOpenMenu(e: React.MouseEvent<HTMLButtonElement>, exam: ExamRecord) {
    setSelected(exam);
    setAnchorEl(e.currentTarget);
  }
  function handleCloseMenu() {
    setAnchorEl(null);
  }
  async function handleDeleteExam() {
    setDeleteError(null);
    setConfirmDelete(true);
    handleCloseMenu();
  }
  function handleEditExam() {
    setEditOpen(true);
    handleCloseMenu();
  }

  return (
    <Card elevation={1}>
      <CardHeader title="الامتحانات" />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          sx={{
            p: 2,
            border: '1px solid var(--neutral-200)',
            borderRadius: '12px',
            bgcolor: 'var(--brand-white)',
            mb: 2
          }}
        >
<Box
  sx={{
    p: 2.5,
    mb: 3,
    borderRadius: 4,
    bgcolor: 'rgba(0, 0, 0, 0.02)', // خلفية هادئة لتمييز منطقة الفلترة
    border: '1px solid',
    borderColor: 'divider',
    transition: 'all 0.3s ease',
    '&:hover': {
      bgcolor: 'rgba(0, 0, 0, 0.03)',
      borderColor: 'primary.light',
    }
  }}
>
  <Stack 
    direction={{ xs: 'column', md: 'row' }} 
    alignItems="center" 
    spacing={2}
  >
    {/* حقل البحث المحسن */}
    <Box sx={{ flexGrow: 1, width: '100%' }}>
      <Input
        placeholder="ابحث عن امتحان معين..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        fullWidth
        size="medium" // حجم أكبر قليلاً لسهولة الاستخدام
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, // إخفاء الحواف التقليدية
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)', // ظل ناعم
        }}
        InputProps={{ 
          startAdornment: (
            <Search 
              sx={{ 
                color: 'primary.main', 
                mr: 1.5, 
                fontSize: 22 
              }} 
            /> 
          ) 
        }}
      />
    </Box>

    {/* فلتر اللغة بتصميم عصري */}
    <Box sx={{ width: { xs: '100%', md: 200 } }}>
      <Input
        select
        label="اللغة"
        value={languageFilter}
        onChange={(e) => setLanguageFilter(e.target.value as 'all' | 'ar' | 'en' | 'tr')}
        fullWidth
        size="medium"
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
        
      >
        <MenuItem value="all" sx={{ fontWeight: 600 }}>الكل (جميع اللغات)</MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem value="ar">العربية</MenuItem>
        <MenuItem value="en">الإنجليزية</MenuItem>
        <MenuItem value="tr">التركية</MenuItem>
      </Input>
    </Box>

    {/* زر مسح الفلاتر - إضافة اختيارية مفيدة جداً */}
    {(searchQuery || languageFilter !== 'all') && (
      <Button 
        variant="text" 
        color="inherit" 
        onClick={() => { setSearchQuery(''); setLanguageFilter('all'); }}
        sx={{ fontSize: 13, whiteSpace: 'nowrap' }}
      >
        مسح الكل
      </Button>
    )}
  </Stack>
</Box>
        </Box>

        <Table
          columns={[
            { id: 'id', label: '#' },
            { id: 'title', label: 'عنوان الامتحان', sortable: true },
            {
              id: 'language',
              label: 'اللغة',
              render: (e: ExamRecord) => (
                <Chip
                  label={
                    e.language === 'ar' ? 'العربية' : e.language === 'tr' ? 'التركية' : 'الإنجليزية'
                  }
                  size="small"
                />
              ),
            },
            {
              id: 'duration',
              label: 'مدة الامتحان',
              render: (e: ExamRecord) => `${e.duration_minutes} دقيقة`,
            },
            {
              id: 'is_active',
              label: 'الحالة',
              render: (e: ExamRecord) => (e.is_active ? 'نشط' : 'غير نشط'),
            },
            {
              id: 'actions',
              label: 'إجراء',
              align: 'right',
              render: (e: ExamRecord) => (
                <>
                  <Button variant="outlined" onClick={(ev) => handleOpenMenu(ev as any, e)}>
                    <MoreVert fontSize="small" />
                  </Button>
                </>
              ),
            },
          ]}
          data={exams}
          loading={loading}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={(col, dir) => {
            if (col === 'title') {
              setSortBy('title');
              setSortDirection(dir);
            }
          }}
          getRowId={(e) => e.id}
        />
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          items={[
            {
              label: (
                <Stack direction="row" spacing={1} alignItems="center">
                  <EditOutlined fontSize="small" />
                  <Typography>تعديل</Typography>
                </Stack>
              ),
              onClick: handleEditExam,
            },
            {
              label: (
                <Stack direction="row" spacing={1} alignItems="center">
                  <DeleteOutline fontSize="small" />
                  <Typography>مسح</Typography>
                </Stack>
              ),
              onClick: handleDeleteExam,
              tone: 'error',
            },
          ]}
        />
        <EditExamModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          exam={selected}
          onSaved={() => {
            setEditOpen(false);
            setReloadKey((k) => k + 1);
          }}
        />
        <DeleteWarning
          open={confirmDelete}
          onCancel={() => {
            setConfirmDelete(false);
            setDeleteError(null);
          }}
          onConfirm={async () => {
            if (!selected) return;
            const res = await deleteExam(selected.id);
            if (res.ok) {
              setConfirmDelete(false);
              setReloadKey((k) => k + 1);
              setDeleteError(null);
            } else {
              setDeleteError(res.error);
            }
          }}
          title="تأكيد حذف الامتحان"
          entityName={selected?.title}
          impacts={['حذف الامتحان', 'حذف جميع أسئلته المرتبطة']}
          confirmText="تأكيد المسح"
          dangerNote={deleteError ?? undefined}
        />
      </CardContent>
    </Card>
  );
}

function EditExamModal({
  open,
  onClose,
  exam,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  exam: ExamRecord | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState('');
  const [language, setLanguage] = React.useState<'ar' | 'en' | 'tr' | ''>('');
  const [duration, setDuration] = React.useState<number | ''>('');
  const [isActive, setIsActive] = React.useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!exam || !open) return;
    setTitle(exam.title);
    setLanguage((exam.language as 'ar' | 'en' | 'tr') ?? '');
    setDuration(exam.duration_minutes);
    setIsActive(exam.is_active ? 'active' : 'inactive');
    setError(null);
    setFieldErrors({});
  }, [exam, open]);

  async function handleSubmit() {
    if (!exam) return;
    setSaving(true);
    setError(null);
    const errs: Record<string, string> = {};
    if (!String(title).trim()) errs.title = 'العنوان مطلوب';
    if (!language) errs.language = 'اللغة مطلوبة';
    const dur = typeof duration === 'string' ? Number(duration) : duration;
    if (!Number.isInteger(dur) || (dur as number) <= 0) errs.duration = 'المدة يجب أن تكون عددًا صحيحًا موجبًا';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setSaving(false);
      return;
    }
    try {
      const res = await updateExam({
        id: exam.id,
        title: title.trim(),
        language: language || undefined,
        duration_minutes: Number(dur),
        is_active: isActive === 'active',
      });
      if (res.ok) {
        onSaved();
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تعديل الامتحان"
      submitText={saving ? 'جاري الحفظ...' : 'حفظ'}
      cancelText="إلغاء"
      onSubmit={handleSubmit}
      onCancel={onClose}
      fullWidth
      maxWidth="sm"
    >
      {!exam ? null : (
        <Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <Input
              label="عنوان الامتحان"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
              error={!!fieldErrors.title}
              helperText={fieldErrors.title}
            />
            <Input
              label="اللغة"
              select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'ar' | 'en' | 'tr')}
              required
              fullWidth
              error={!!fieldErrors.language}
              helperText={fieldErrors.language}
            >
              <MenuItem value="ar">العربية</MenuItem>
              <MenuItem value="en">الإنجليزية</MenuItem>
              <MenuItem value="tr">التركية</MenuItem>
            </Input>
            <Input
              label="مدة الامتحان (بالدقائق)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
              required
              fullWidth
              error={!!fieldErrors.duration}
              helperText={fieldErrors.duration}
            />
            <Input
              label="الحالة"
              select
              value={isActive}
              onChange={(e) => setIsActive(e.target.value as 'active' | 'inactive')}
              fullWidth
            >
              <MenuItem value="active">نشط</MenuItem>
              <MenuItem value="inactive">غير نشط</MenuItem>
            </Input>
          </Stack>
        </Box>
      )}
    </Modal>
  );
}
export default function AdminExamPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>إدارة الامتحانات</Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
            إضافة، بحث، وتصفية الامتحانات حسب اللغة والحالة
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setAddOpen(true)}>
          إضافة امتحان
        </Button>
      </Stack>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <ExamsTable key={reloadKey} />
          </Box>
        </CardContent>
      </Card>
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة امتحان"
        submitText="حفظ"
        cancelText="إلغاء"
        onSubmit={() => {
          const form = document.getElementById('add-exam-form') as HTMLFormElement | null;
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
        <AddExamForm
          formId="add-exam-form"
          onCreated={() => {
            setAddOpen(false);
            setReloadKey((k) => k + 1);
          }}
        />
      </Modal>
    </Container>
  );
}

