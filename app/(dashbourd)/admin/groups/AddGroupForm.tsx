'use client';

import * as React from 'react';
import { Alert, Box, MenuItem, Snackbar } from '@mui/material';
import { Card, CardHeader, CardContent, CardActions, Input, Button, Form } from '@/components/ui';
import { createExamGroup } from '@/app/actions/exam';

export default function AddGroupForm({
  onCreated,
  formId,
}: {
  onCreated: () => void;
  formId?: string;
}) {
  const [title, setTitle] = React.useState('');
  const [language, setLanguage] = React.useState<'ar' | 'en' | 'tr' | ''>('');
  const [isActive, setIsActive] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [successOpen, setSuccessOpen] = React.useState(false);

  function validate() {
    const errs: Record<string, string> = {};
    if (!String(title).trim()) errs.title = 'العنوان مطلوب';
    if (!language) errs.language = 'اللغة مطلوبة';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await createExamGroup({
        title: title.trim(),
        language,
        is_active: isActive,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccessOpen(true);
      setTitle('');
      setLanguage('');
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
      <CardHeader title="إضافة مجموعة" />
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
                label="عنوان المجموعة"
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
                label="حالة المجموعة"
                select
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive((e.target.value as string) === 'active')}
                fullWidth
              >
                <MenuItem value="active">نشطة</MenuItem>
                <MenuItem value="inactive">غير نشطة</MenuItem>
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
          message="تم إنشاء المجموعة بنجاح"
        />
      </CardContent>
    </Card>
  );
}
