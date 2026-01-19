'use client';

import * as React from 'react';
import { Alert, Box, MenuItem } from '@mui/material';
import { Modal } from '@/components/ui/Modal';
import { Input, Form } from '@/components/ui';
import { updateExamGroup, type ExamGroupRecord } from '@/app/actions/exam';

export default function EditGroupModal({
  open,
  onClose,
  group,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  group: ExamGroupRecord | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState('');
  const [language, setLanguage] = React.useState<'ar' | 'en' | 'tr' | ''>('');
  const [isActive, setIsActive] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!group) return;
    setTitle(group.title);
    setLanguage(group.language as 'ar' | 'en' | 'tr');
    setIsActive(group.is_active);
  }, [group]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!String(title).trim()) errs.title = 'العنوان مطلوب';
    if (!language) errs.language = 'اللغة مطلوبة';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!group) return;
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await updateExamGroup({
        id: group.id,
        title: title.trim(),
        language,
        is_active: isActive,
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      onCancel={onClose}
      title="تعديل المجموعة"
      submitText="حفظ"
      onSubmit={() => {
        const form = document.getElementById('edit-group-form') as HTMLFormElement | null;
        if (form) form.requestSubmit();
      }}
      fullWidth
      maxWidth="sm"
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Form id="edit-group-form" onSubmit={handleSubmit}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Input
            label="عنوان المجموعة"
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
            label="الحالة"
            select
            value={isActive ? 'active' : 'inactive'}
            onChange={(e) => setIsActive((e.target.value as string) === 'active')}
            fullWidth
          >
            <MenuItem value="active">نشطة</MenuItem>
            <MenuItem value="inactive">غير نشطة</MenuItem>
          </Input>
        </Box>
        <input type="hidden" value={submitting ? '1' : '0'} />
      </Form>
    </Modal>
  );
}
