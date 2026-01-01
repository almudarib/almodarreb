'use client';
import * as React from 'react';
import type { StudentRecord } from '@/app/actions/students';
import { updateStudent, getStudentProgress } from '@/app/actions/students';
import type { UpdateStudentInput } from '@/app/actions/students';
import StudentProgress from '@/components/student/StudentProgress';
import type { StudentProgressData } from '@/app/actions/students';
import { useRouter } from 'next/navigation';

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

  return (
    !open ? null : (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative z-10 mx-auto my-8 w-full max-w-3xl px-4">
          <div className="rounded-lg bg-white dark:bg-neutral-900 shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">بيانات الطالب</h2>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                onClick={onClose}
              >
                إغلاق
              </button>
            </div>
            {!student ? null : (
              <div className="px-6 py-4" dir="rtl">
                <div className="space-y-6">
                  <div className="text-sm">الأستاذ المشرف: {teacherName ?? '--'}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">اسم الطالب</label>
                      <input
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={form.name ?? ''}
                        onChange={(e) => setField('name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">رقم الهوية</label>
                      <input
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        inputMode="numeric"
                        value={form.national_id ?? ''}
                        onChange={(e) => setField('national_id', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">تاريخ الامتحان</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={form.exam_datetime ? String(form.exam_datetime).slice(0, 16) : ''}
                        onChange={(e) => setField('exam_datetime', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">تاريخ البدء</label>
                      <input
                        type="date"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={form.start_date ?? ''}
                        onChange={(e) => setField('start_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">تاريخ التسجيل</label>
                      <input
                        type="date"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={form.registration_date ?? ''}
                        onChange={(e) => setField('registration_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">آخر تسجيل دخول</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={form.last_login_at ? String(form.last_login_at).slice(0, 16) : ''}
                        onChange={(e) => setField('last_login_at', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="mb-1 block text-sm font-medium">ملاحظة</label>
                      <textarea
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        rows={3}
                        value={form.notes ?? ''}
                        onChange={(e) => setField('notes', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">الحالة</label>
                      <input
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={form.status ?? ''}
                        onChange={(e) => setField('status', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        id="details_show_exams"
                        type="checkbox"
                        className="h-4 w-4 rounded border"
                        checked={!!form.show_exams}
                        onChange={(e) => setField('show_exams', e.target.checked)}
                      />
                      <label htmlFor="details_show_exams" className="text-sm">إظهار الاختبارات</label>
                    </div>
                  </div>
                  <StudentProgress data={progress} />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm"
                onClick={onClose}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );
}

export default StudentDetailsModal;
