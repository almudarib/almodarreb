'use client';
import * as React from 'react';
import { addStudent } from '@/app/actions/students';
import type { AddStudentInput } from '@/app/actions/students';
import { useRouter } from 'next/navigation';
import { listUsersByKind } from '@/app/actions/users';

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
    !open ? null : (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative z-10 mx-auto my-8 w-full max-w-3xl px-4">
          <div className="rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-neutral-900">إضافة طالب جديد</h2>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-100"
                onClick={onClose}
              >
                إغلاق
              </button>
            </div>
            <div className="px-6 py-4 text-neutral-900" dir="rtl">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">اسم الطالب</label>
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                    />
                    {errors.name ? (
                      <div className="mt-1 text-xs text-red-600">{errors.name}</div>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">رقم الهوية</label>
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                      inputMode="numeric"
                      value={form.national_id}
                      onChange={(e) => setField('national_id', e.target.value)}
                    />
                    {errors.national_id ? (
                      <div className="mt-1 text-xs text-red-600">{errors.national_id}</div>
                    ) : null}
                  </div>
                  <div>
                    {/* تم إلغاء اختيار اللغة من النموذج */}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">تاريخ ووقت الاختبار</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                      value={form.exam_datetime}
                      onChange={(e) => setField('exam_datetime', e.target.value)}
                    />
                    {errors.exam_datetime ? (
                      <div className="mt-1 text-xs text-red-600">{errors.exam_datetime}</div>
                    ) : null}
                  </div>
                  {/* تم إلغاء حقول التواريخ من الواجهة وتحسب في الخلفية فقط */}
                  <div className="md:col-span-1">
                    <label className="mb-1 block text-sm font-medium">ملاحظة</label>
                    <textarea
                      className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setField('notes', e.target.value)}
                    />
                    {errors.notes ? (
                      <div className="mt-1 text-xs text-red-600">{errors.notes}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="show_exams"
                      type="checkbox"
                      className="h-4 w-4 rounded border bg-white"
                      checked={form.show_exams}
                      onChange={(e) => setField('show_exams', e.target.checked)}
                    />
                    <label htmlFor="show_exams" className="text-sm">إظهار الاختبارات</label>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">الأستاذ المشرف</label>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                      value={form.teacher_id}
                      onChange={(e) => setField('teacher_id', Number(e.target.value))}
                    >
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {errors.teacher_id ? (
                      <div className="mt-1 text-xs text-red-600">{errors.teacher_id}</div>
                    ) : null}
                  </div>
                </div>

              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button
                type="button"
                className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
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
                {saving ? 'جاري الإضافة...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );
}

export default AddStudentModal;
