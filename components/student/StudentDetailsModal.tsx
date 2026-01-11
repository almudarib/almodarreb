'use client';
import * as React from 'react';
import type { StudentRecord } from '@/app/actions/students';
import { updateStudent, getStudentProgress, getStudentLoginHistory } from '@/app/actions/students';
import type { UpdateStudentInput } from '@/app/actions/students';
import StudentProgress from '@/components/student/StudentProgress';
import type { StudentProgressData } from '@/app/actions/students';
import type { StudentLoginEvent } from '@/app/actions/students';
import { useRouter } from 'next/navigation';
import { Box, Stack, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/button';

export type StudentDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  student: StudentRecord | null;
  teacherName?: string;
};

export function StudentDetailsModal({
  open,
  onClose,
  student,
  teacherName,
}: StudentDetailsModalProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [progress, setProgress] = React.useState<StudentProgressData | null>(null);
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [loginHistory, setLoginHistory] = React.useState<StudentLoginEvent[] | null>(null);

  // حالة النموذج القابلة للتحرير
  const [form, setForm] = React.useState<Partial<StudentRecord>>({});
  React.useEffect(() => {
    if (student) {
      setForm({
        name: student.name,
        national_id: student.national_id,
        exam_datetime: student.exam_datetime,
        start_date: student.start_date,
        registration_date: student.registration_date,
        last_login_at: student.last_login_at,
        notes: student.notes ?? '',
        status: student.status,
        show_exams: student.show_exams,
        teacher_id: student.teacher_id,
      });
    }
  }, [student]);

  React.useEffect(() => {
    let active = true;
    async function loadProgress() {
      if (!student) return;
      const r = await getStudentProgress(student.id);
      if (!active) return;
      if (r.ok) setProgress(r.progress);
      else setProgress(null);
    }
    if (open) loadProgress();
    return () => {
      active = false;
    };
  }, [open, student]);

  React.useEffect(() => {
    let active = true;
    async function loadLogins() {
      if (!student || !loginOpen) return;
      setLoginLoading(true);
      const r = await getStudentLoginHistory(student.id);
      if (!active) return;
      setLoginLoading(false);
      if (r.ok) setLoginHistory(r.events);
      else setLoginHistory([]);
    }
    loadLogins();
    return () => {
      active = false;
    };
  }, [student, loginOpen]);

  function setField<K extends keyof StudentRecord>(key: K, value: StudentRecord[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!student) return;
    setSaving(true);
    const payload: UpdateStudentInput = { id: student.id };
    if (form.name !== undefined) payload.name = form.name as string;
    if (form.national_id !== undefined) payload.national_id = form.national_id as string;
    if (form.exam_datetime !== undefined)
      payload.exam_datetime =
        form.exam_datetime === '' ? null : (form.exam_datetime as string | null);
    if (form.start_date !== undefined)
      payload.start_date = form.start_date === '' ? null : (form.start_date as string | null);
    if (form.registration_date !== undefined)
      payload.registration_date =
        form.registration_date === '' ? null : (form.registration_date as string | null);
    if (form.last_login_at !== undefined)
      payload.last_login_at =
        form.last_login_at === '' ? null : (form.last_login_at as string | null);
    if (form.notes !== undefined) payload.notes = form.notes as string | null;
    if (form.status !== undefined) payload.status = form.status as string;
    if (form.show_exams !== undefined) payload.show_exams = !!form.show_exams;
    if (form.teacher_id !== undefined) payload.teacher_id = Number(form.teacher_id);
    const r = await updateStudent(payload);
    setSaving(false);
    if (r.ok) {
      onClose();
      router.refresh();
    } else {
      alert(r.error);
    }
  }

  function formatDate(value: string | null): string {
    if (!value) return '--';
    const d = new Date(String(value));
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const h24 = d.getHours();
    const isPm = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const hh = String(h12).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const suffix = isPm ? 'م' : 'ص';
    return `${dd}-${mm}-${yyyy}  ${hh}:${mi}${suffix}`;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="بيانات الطالب"
      submitText={saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
      cancelText="إلغاء"
      onSubmit={handleSubmit}
      onCancel={onClose}
      fullWidth
      maxWidth="md"
    >
      {!student ? null : (
        <Box dir="rtl">
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'var(--neutral-700)' }}>
              الأستاذ المشرف: {teacherName ?? '--'}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
              <Box>
                <Label>اسم الطالب</Label>
                <Input
                  value={form.name ?? ''}
                  onChange={(e) => setField('name', e.target.value)}
                  aria-label="اسم الطالب"
                />
              </Box>
              <Box>
                <Label>رقم الهوية</Label>
                <Input
                  inputMode="numeric"
                  value={form.national_id ?? ''}
                  onChange={(e) => setField('national_id', e.target.value)}
                  aria-label="رقم الهوية"
                />
              </Box>
              <Box>
                <Label>تاريخ الامتحان</Label>
                <Input
                  type="datetime-local"
                  value={form.exam_datetime ? String(form.exam_datetime).slice(0, 16) : ''}
                  onChange={(e) => setField('exam_datetime', e.target.value)}
                  aria-label="تاريخ الامتحان"
                />
              </Box>
              <Box>
                <Label>تاريخ البدء</Label>
                <Input
                  type="date"
                  value={form.start_date ?? ''}
                  onChange={(e) => setField('start_date', e.target.value)}
                  aria-label="تاريخ البدء"
                />
              </Box>
              <Box>
                <Label>تاريخ التسجيل</Label>
                <Input
                  type="date"
                  value={form.registration_date ?? ''}
                  onChange={(e) => setField('registration_date', e.target.value)}
                  aria-label="تاريخ التسجيل"
                />
              </Box>
              <Box>
                <Label>آخر تسجيل دخول</Label>
                <Input
                  type="datetime-local"
                  value={form.last_login_at ? String(form.last_login_at).slice(0, 16) : ''}
                  onChange={(e) => setField('last_login_at', e.target.value)}
                  aria-label="آخر تسجيل دخول"
                />
              </Box>
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Label>ملاحظة</Label>
                <Input
                  multiline
                  rows={3}
                  value={form.notes ?? ''}
                  onChange={(e) => setField('notes', e.target.value)}
                  aria-label="ملاحظة"
                />
              </Box>
              <Box>
                <Label>الحالة</Label>
                <Input
                  value={form.status ?? ''}
                  onChange={(e) => setField('status', e.target.value)}
                  aria-label="الحالة"
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Checkbox
                  checked={!!form.show_exams}
                  onChange={(e) => setField('show_exams', e.target.checked)}
                  inputProps={{ 'aria-label': 'إظهار الاختبارات' }}
                  label="إظهار الاختبارات"
                />
              </Box>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Input
                value={loginOpen ? 'إخفاء التعقب' : 'تعقب تسجيلات الدخول'}
                aria-label="زر التعقب"
                onFocus={() => setLoginOpen((v) => !v)}
                sx={{ display: 'none' }}
              />
              <Typography
                role="button"
                tabIndex={0}
                onClick={() => setLoginOpen((v) => !v)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLoginOpen((v) => !v); }}
                sx={{ color: 'var(--brand-teal)', cursor: 'pointer', fontWeight: 600 }}
              >
                {loginOpen ? 'إخفاء التعقب' : 'تعقب تسجيلات الدخول'}
              </Typography>
            </Stack>
            <Dialog
              open={loginOpen}
              onClose={() => setLoginOpen(false)}
              title="سجل تسجيلات الدخول"
              actions={<Button variant="outlined" onClick={() => setLoginOpen(false)}>إغلاق</Button>}
            >
              {loginLoading ? (
                <Typography variant="body2" sx={{ color: 'var(--neutral-600)' }}>جاري التحميل...</Typography>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>وقت الدخول</TableCell>
                      <TableCell>وقت الخروج</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loginHistory && loginHistory.length > 0 ? (
                      loginHistory.map((ev) => (
                        <TableRow key={ev.id}>
                          <TableCell>{formatDate(ev.logged_in_at)}</TableCell>
                          <TableCell>{ev.logged_out_at ? formatDate(ev.logged_out_at) : '--'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2}>
                          <Typography variant="body2">لا توجد سجلات</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </Dialog>
            <StudentProgress data={progress} />
          </Stack>
        </Box>
      )}
    </Modal>
  );
}

export default StudentDetailsModal;
