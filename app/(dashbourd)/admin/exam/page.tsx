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
} from '@mui/material';
import { Input, Card, CardHeader, CardContent, CardActions, Button, Modal, Form, Table } from '@/components/ui';
import { type ExamRecord, createExam, listExams, type ListExamsQuery } from '@/app/actions/exam';
import { Search } from '@mui/icons-material';

function AddExamForm({
  onCreated,
  formId,
}: {
  onCreated: () => void;
  formId?: string;
}) {
  const [title, setTitle] = React.useState('');
  const [language, setLanguage] = React.useState<'AR' | 'EN' | ''>('');
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
                onChange={(e) => setLanguage(e.target.value as 'AR' | 'EN')}
                required
                fullWidth
                error={!!fieldErrors.language}
                helperText={fieldErrors.language}
              >
                <MenuItem value="AR">AR</MenuItem>
                <MenuItem value="EN">EN</MenuItem>
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

  const [searchQuery, setSearchQuery] = React.useState('');
  const [languageFilter, setLanguageFilter] = React.useState<'all' | 'AR' | 'EN'>('all');
  const [sortBy, setSortBy] = React.useState<'created_at' | 'title'>('created_at');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const page = 1;
  const perPage = 20;

  const [reloadKey, setReloadKey] = React.useState(0);

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

  return (
    <Card elevation={1}>
      <CardHeader title="الامتحانات" />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Input
            placeholder="البحث"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <Search fontSize="small" /> }}
            size="small"
          />
          <Input
            label="اللغة"
            select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as 'all' | 'AR' | 'EN')}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="AR">AR</MenuItem>
            <MenuItem value="EN">EN</MenuItem>
          </Input>
        </Stack>

        <Table
          columns={[
            { id: 'id', label: '#' },
            { id: 'title', label: 'عنوان الامتحان', sortable: true },
            {
              id: 'language',
              label: 'اللغة',
              render: (e: ExamRecord) => <Chip label={String(e.language).toUpperCase()} size="small" />,
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
      </CardContent>
    </Card>
  );
}

export default function AdminExamPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">الامتحانات</Typography>
        <Button variant="contained" onClick={() => setAddOpen(true)}>
          إضافة امتحان
        </Button>
      </Stack>
      <ExamsTable key={reloadKey} />
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

