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

  React.useEffect(() => {
    // تحميل التقدم عند فتح النافذة
  }, []);

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

  async function handleSubmit() {
    onClose();
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
  function formatDateOnly(value: string | null): string {
    if (!value) return '--';
    const d = new Date(String(value));
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}-${mm}-${yyyy}`;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="بيانات الطالب"
      submitText="غير متاح"
      cancelText="إغلاق"
      onSubmit={handleSubmit}
      onCancel={onClose}
      submitDisabled
      fullWidth
      maxWidth="md"
    >
      {!student ? null : (
        <Box dir="rtl">
          <Stack spacing={2}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>الحقل</TableCell>
                  <TableCell>القيمة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>اسم الطالب</TableCell>
                  <TableCell>{student.name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>رقم الهوية</TableCell>
                  <TableCell>{student.national_id}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>تاريخ الامتحان</TableCell>
                  <TableCell>{formatDate(student.exam_datetime)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>تاريخ البدء</TableCell>
                  <TableCell>{formatDateOnly(student.start_date)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>تاريخ التسجيل</TableCell>
                  <TableCell>{formatDateOnly(student.registration_date)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>آخر تسجيل دخول</TableCell>
                  <TableCell>{formatDate(student.last_login_at)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>الأستاذ المشرف</TableCell>
                  <TableCell>{teacherName ?? '--'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>الحالة</TableCell>
                  <TableCell>{student.status}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>إظهار الاختبارات</TableCell>
                  <TableCell>{student.show_exams ? 'نعم' : 'لا'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>ملاحظة</TableCell>
                  <TableCell>{student.notes ?? '--'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
