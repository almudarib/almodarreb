'use client';
import * as React from 'react';
import { addStudent } from '@/app/actions/students';
import type { AddStudentInput } from '@/app/actions/students';
import { useRouter } from 'next/navigation';
import { listUsersByKind } from '@/app/actions/users';
import { Box, Stack, MenuItem, Typography } from '@mui/material';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/Checkbox';

export type AddStudentModalProps = {
  open: boolean;
  onClose: () => void;
  defaultTeacherId?: number;
};

export function AddStudentModal({ open, onClose, defaultTeacherId }: AddStudentModalProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState({
    name: '',
    national_id: '',
    exam_datetime: '',
    notes: '',
    show_exams: true,
    teacher_id: defaultTeacherId ?? 0,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [teachers, setTeachers] = React.useState<Array<{ id: number; name: string }>>([]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  // التواريخ تُحسب في الخلفية فقط، لا حاجة لحسابها هنا

  React.useEffect(() => {
    let active = true;
    async function loadTeachers() {
      const r = await listUsersByKind('teacher');
      if (!active) return;
      if (r.ok) {
        const list = r.users.map((u) => ({ id: u.id, name: u.name }));
        setTeachers(list);
        setForm((f) => ({
          ...f,
          teacher_id: f.teacher_id && f.teacher_id > 0 ? f.teacher_id : (list[0]?.id ?? 0),
        }));
      }
    }
    if (open) loadTeachers();
    return () => {
      active = false;
    };
  }, [open]);

  async function handleSubmit() {
    setSaving(true);
    setErrors({});
    const input = {
      name: form.name,
      national_id: form.national_id,
      exam_datetime: form.exam_datetime || undefined,
      notes: form.notes || undefined,
      show_exams: form.show_exams,
      teacher_id: Number(form.teacher_id),
    };

    const r = await addStudent(input as AddStudentInput);
    setSaving(false);
    if (r.ok) {
      onClose();
      router.refresh();
    } else {
      setErrors(r.fieldErrors ?? {});
      alert(r.error);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة طالب جديد"
      submitText={saving ? 'جاري الإضافة...' : 'إضافة'}
      cancelText="إلغاء"
      onSubmit={handleSubmit}
      onCancel={onClose}
      fullWidth
      maxWidth="md"
    >
      <Box dir="rtl">
        <Stack spacing={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            <Box>
              <Label>اسم الطالب</Label>
              <Input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="الاسم الكامل"
                aria-label="اسم الطالب"
              />
              {errors.name ? <Typography variant="caption" color="error">{errors.name}</Typography> : null}
            </Box>
            <Box>
              <Label>رقم الهوية</Label>
              <Input
                inputMode="numeric"
                value={form.national_id}
                onChange={(e) => setField('national_id', e.target.value)}
                placeholder="رقم الهوية الوطنية"
                aria-label="رقم الهوية"
              />
              {errors.national_id ? <Typography variant="caption" color="error">{errors.national_id}</Typography> : null}
            </Box>
            <Box>
              <Label>تاريخ ووقت الاختبار</Label>
              <Input
                type="datetime-local"
                value={form.exam_datetime}
                onChange={(e) => setField('exam_datetime', e.target.value)}
                aria-label="تاريخ ووقت الاختبار"
              />
              {errors.exam_datetime ? <Typography variant="caption" color="error">{errors.exam_datetime}</Typography> : null}
            </Box>
            <Box>
              <Label>ملاحظة</Label>
              <Input
                multiline
                rows={3}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                aria-label="ملاحظة"
              />
              {errors.notes ? <Typography variant="caption" color="error">{errors.notes}</Typography> : null}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Checkbox
                checked={form.show_exams}
                onChange={(e) => setField('show_exams', e.target.checked)}
                inputProps={{ 'aria-label': 'إظهار الاختبارات' }}
                label="إظهار الاختبارات"
              />
            </Box>
            <Box>
              <Label>الأستاذ المشرف</Label>
              <Input
                select
                value={form.teacher_id}
                onChange={(e) => setField('teacher_id', Number(e.target.value))}
                aria-label="الأستاذ المشرف"
              >
                {teachers.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Input>
              {errors.teacher_id ? <Typography variant="caption" color="error">{errors.teacher_id}</Typography> : null}
            </Box>
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
}

export default AddStudentModal;
