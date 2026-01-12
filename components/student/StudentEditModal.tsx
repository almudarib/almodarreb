'use client';
import * as React from 'react';
import type { StudentRecord } from '@/app/actions/students';
import { updateStudent } from '@/app/actions/students';
import { listUsersByKind } from '@/app/actions/users';
import { useRouter } from 'next/navigation';
import { Box, Stack, MenuItem, Typography } from '@mui/material';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/Checkbox';

export type StudentEditModalProps = {
  open: boolean;
  onClose: () => void;
  student: StudentRecord | null;
};

export function StudentEditModal({ open, onClose, student }: StudentEditModalProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [teachers, setTeachers] = React.useState<Array<{ id: number; name: string }>>([]);
  const [form, setForm] = React.useState({
    name: '',
    exam_datetime: '',
    show_exams: true,
    language: 'ar',
    teacher_id: 0,
    status: 'active',
    notes: '',
  });

  React.useEffect(() => {
    if (!student) return;
    setForm({
      name: student.name,
      exam_datetime: student.exam_datetime ? String(student.exam_datetime).slice(0, 16) : '',
      show_exams: student.show_exams,
      language: student.language ?? 'ar',
      teacher_id: student.teacher_id,
      status: student.status,
      notes: student.notes ?? '',
    });
  }, [student]);

  React.useEffect(() => {
    let active = true;
    async function loadTeachers() {
      const r = await listUsersByKind('teacher');
      if (!active) return;
      if (r.ok) {
        const list = r.users.map((u) => ({ id: u.id, name: u.name }));
        setTeachers(list);
      }
    }
    if (open) loadTeachers();
    return () => {
      active = false;
    };
  }, [open]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!student) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      id: student.id,
      name: form.name,
      exam_datetime: form.exam_datetime ? form.exam_datetime : null,
      show_exams: !!form.show_exams,
      teacher_id: Number(form.teacher_id),
      status: form.status,
      notes: form.notes || null,
      language: form.language,
    };
    const r = await updateStudent(payload as any);
    setSaving(false);
    if (r.ok) {
      onClose();
      router.refresh();
    } else {
      alert(r.error);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تحرير بيانات الطالب"
      submitText={saving ? 'جاري الحفظ...' : 'حفظ'}
      cancelText="إلغاء"
      onSubmit={handleSubmit}
      onCancel={onClose}
      fullWidth
      maxWidth="md"
    >
      {!student ? null : (
        <Box dir="rtl">
          <Stack spacing={3}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
              <Box>
                <Label>اسم الطالب</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  aria-label="اسم الطالب"
                />
              </Box>
              <Box>
                <Label>تاريخ الامتحان</Label>
                <Input
                  type="datetime-local"
                  value={form.exam_datetime}
                  onChange={(e) => setField('exam_datetime', e.target.value)}
                  aria-label="تاريخ الامتحان"
                />
              </Box>
              <Box>
                <Label>لغة الطالب</Label>
                <Input
                  select
                  value={form.language}
                  onChange={(e) => setField('language', String(e.target.value))}
                  aria-label="لغة الطالب"
                >
                  <MenuItem value="ar">العربية</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="tr">التركية</MenuItem>
                </Input>
              </Box>
              <Box>
                <Label>الحالة</Label>
                <Input
                  select
                  value={form.status}
                  onChange={(e) => setField('status', String(e.target.value))}
                  aria-label="الحالة"
                >
                  <MenuItem value="active">نشط</MenuItem>
                  <MenuItem value="inactive">غير نشط</MenuItem>
                  <MenuItem value="passed">ناجح</MenuItem>
                  <MenuItem value="failed">راسب</MenuItem>
                </Input>
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
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Checkbox
                  checked={form.show_exams}
                  onChange={(e) => setField('show_exams', e.target.checked)}
                  inputProps={{ 'aria-label': 'إظهار الاختبارات' }}
                  label="إظهار الاختبارات"
                />
              </Box>
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Label>ملاحظة</Label>
                <Input
                  multiline
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  aria-label="ملاحظة"
                />
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">
              سيتم حفظ التغييرات وتحديث الصفحة مباشرةً بعد التأكيد.
            </Typography>
          </Stack>
        </Box>
      )}
    </Modal>
  );
}

export default StudentEditModal;
