'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type StudentLoginInput = {
  national_id: string;
  device_fingerprint?: string;
};

export type StudentLoginRecord = {
  id: number;
  auth_user_id: string;
  name: string;
  national_id: string;
  status: string;
  show_exams: boolean;
  teacher_id: number;
  last_login_at: string | null;
};

export async function loginStudentByNationalId(
  input: StudentLoginInput,
): Promise<
  | { ok: true; student: StudentLoginRecord }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; details?: unknown }
> {
  try {
    const errors: Record<string, string> = {};
    const ni = String(input?.national_id ?? '').trim();
    if (!/^\d{10,20}$/.test(ni)) {
      errors.national_id = 'رقم الهوية غير صالح';
    }
    const df = input?.device_fingerprint
      ? String(input.device_fingerprint).trim()
      : undefined;
    if (Object.keys(errors).length > 0) {
      return { ok: false, error: 'فشل التحقق من البيانات', fieldErrors: errors };
    }

    const supabase = createAdminClient();
    const { data: row, error: selErr } = await supabase
      .from('students')
      .select(
        [
          'id',
          'auth_user_id',
          'name',
          'national_id',
          'status',
          'show_exams',
          'teacher_id',
          'last_login_at',
        ].join(','),
      )
      .eq('national_id', ni)
      .limit(1)
      .maybeSingle();
    if (selErr) {
      return { ok: false, error: selErr.message, details: selErr };
    }
    const r = (row as unknown) as Record<string, unknown> | null;
    if (!r || r.id === undefined) {
      return { ok: false, error: 'لا يوجد طالب بهذا الرقم' };
    }
    const status = (r.status as string | undefined) ?? 'active';
    if (status !== 'active') {
      return { ok: false, error: 'حساب الطالب غير نشط' };
    }

    const { data: devicesRows, error: devicesErr } = await supabase
      .from('student_devices')
      .select('id,device_fingerprint,is_active,last_used_at')
      .eq('student_id', r.id as number);
    if (devicesErr) {
      return { ok: false, error: devicesErr.message, details: devicesErr };
    }
    const devList = (devicesRows ?? []).map((dv) => (dv as unknown) as Record<string, unknown>);
    const activeDevices = devList.filter((d) => d.is_active === true);

    const nowIso = new Date().toISOString();
    if (df && df.length > 0) {
      const matched = activeDevices.find(
        (d) => String(d.device_fingerprint ?? '').trim() === df,
      );
      if (activeDevices.length === 0) {
        const { error: insErr } = await supabase.from('student_devices').insert({
          student_id: r.id as number,
          device_fingerprint: df,
          last_used_at: nowIso,
          is_active: true,
        });
        if (insErr) {
          return { ok: false, error: insErr.message, details: insErr };
        }
      } else if (matched) {
        const mid = matched.id as number;
        const { error: updDevErr } = await supabase
          .from('student_devices')
          .update({ last_used_at: nowIso, is_active: true })
          .eq('id', mid);
        if (updDevErr) {
          return { ok: false, error: updDevErr.message, details: updDevErr };
        }
      } else {
        return { ok: false, error: 'لا يمكن الدخول من أكثر من جهاز' };
      }
    } else {
      if (activeDevices.length > 0) {
        return { ok: false, error: 'لا يمكن الدخول من غير الجهاز المسجل مسبقًا' };
      }
    }

    const { error: updErr } = await supabase
      .from('students')
      .update({ last_login_at: nowIso })
      .eq('id', r.id as number);
    if (updErr) {
      return { ok: false, error: updErr.message, details: updErr };
    }

    const student: StudentLoginRecord = {
      id: r.id as number,
      auth_user_id: r.auth_user_id as string,
      name: r.name as string,
      national_id: r.national_id as string,
      status,
      show_exams: (r.show_exams as boolean | undefined) ?? true,
      teacher_id: r.teacher_id as number,
      last_login_at: nowIso,
    };
    return { ok: true, student };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

