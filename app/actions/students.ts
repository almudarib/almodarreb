'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import {
  validateAddStudentInput,
  validateListStudentsQuery,
} from '@/lib/validation/students';
import { addAccountingCharge } from '@/app/actions/accounting';

export type StudentRecord = {
  id: number;
  auth_user_id: string;
  name: string;
  national_id: string;
  exam_datetime: string | null;
  start_date: string | null;
  registration_date: string | null;
  last_login_at: string | null;
  notes: string | null;
  status: string;
  show_exams: boolean;
  teacher_id: number;
  language: string;
  created_at: string;
  updated_at: string | null;
};

export type AddStudentInput = {
  name: string;
  national_id: string;
  exam_datetime?: string | Date;
  notes?: string;
  status?: string;
  show_exams?: boolean;
  language: string;
  teacher_id: number;
  auth?: { auth_user_id: string } | { create_auth: { email: string; password: string } };
};

export type AddStudentResult =
  | { ok: true; student: StudentRecord }
  | { ok: false; error: string; details?: unknown; fieldErrors?: Record<string, string> };

/**
 * إضافة طالب جديد مع التحقق من صحة البيانات.
 * يدعم استخدام مستخدم مصادقة موجود (auth_user_id) أو إنشاء مستخدم جديد عبر البريد وكلمة المرور.
 * يتبع أفضل ممارسات الأمان: التحقق الصارم، استخدام Supabase PostgREST الآمن، وعدم كشف بيانات حساسة.
 */
export async function addStudent(input: AddStudentInput): Promise<AddStudentResult> {
  try {
    const supa = await createServerClient();
    const { data: claims } = await supa.auth.getClaims();
    const hasUser = !!claims?.claims;
    if (!hasUser) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    if (!uid) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    if (!userId) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const isAdmin = roleNames.includes('admin');
    if (!isTeacher && !isAdmin) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const v = validateAddStudentInput(input);
    if (!v.ok) {
      return {
        ok: false,
        error: 'فشل التحقق من صحة البيانات',
        fieldErrors: (v.errors as unknown) as Record<string, string>,
      };
    }
    const payload = v.value as {
      name: string;
      national_id: string;
      exam_datetime?: string;
      start_date?: string;
      registration_date?: string;
      last_login_at?: string;
      notes?: string;
      status?: string;
      show_exams?: boolean;
      language: string;
      teacher_id: number;
      create_auth?: { email: string; password: string };
    };

    if (isTeacher) {
      payload.teacher_id = userId!;
    }
    const supabase = createAdminClient();

    // تأكد من وجود المعلم (teacher_id) لتجنب خطأ المفتاح الأجنبي
    {
      const { data: teacherRow, error: teacherErr } = await supabase
        .from('users')
        .select('id')
        .eq('id', payload.teacher_id)
        .maybeSingle();
      if (teacherErr) {
        return { ok: false, error: teacherErr.message, details: teacherErr };
      }
      if (!teacherRow?.id) {
        return { ok: false, error: 'المعلم المحدد غير موجود' };
      }
    }

    const email =
      `student+${payload.national_id}.${Date.now()}@example.com`.toLowerCase();
    const password =
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const { data: created, error: createAuthErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: payload.name, kind: 'student' },
    });
    if (createAuthErr) {
      return { ok: false, error: createAuthErr.message, details: createAuthErr };
    }
    const authUserId = created.user?.id ?? undefined;
    if (!authUserId) {
      return { ok: false, error: 'فشل إنشاء مستخدم المصادقة للطالب' };
    }

    const nowIso = new Date().toISOString();
    const todayIso = new Date().toISOString().slice(0, 10);
    const start_date = todayIso;
    const registration_date = todayIso;
    const last_login_at = nowIso;

    const insertPayload: Record<string, unknown> = {
      auth_user_id: authUserId,
      name: payload.name,
      national_id: payload.national_id,
      language: payload.language,
      teacher_id: payload.teacher_id,
      start_date,
      registration_date,
      last_login_at,
    };
    if (payload.exam_datetime !== undefined) insertPayload.exam_datetime = payload.exam_datetime;
    if (payload.notes !== undefined) insertPayload.notes = payload.notes;
    if (payload.status !== undefined) insertPayload.status = payload.status;
    if (payload.show_exams !== undefined) insertPayload.show_exams = payload.show_exams;

    const { data: inserted, error: insertErr } = await supabase
      .from('students')
      .insert(insertPayload)
      .select(
        [
          'id',
          'auth_user_id',
          'name',
          'national_id',
          'exam_datetime',
          'start_date',
          'registration_date',
          'last_login_at',
          'notes',
          'status',
          'show_exams',
          'teacher_id',
          'language',
          'created_at',
          'updated_at',
        ].join(','),
      )
      .single();
    if (insertErr) {
      return { ok: false, error: insertErr.message, details: insertErr };
    }
    await supabase.from('student_actions').insert({
      student_id: (inserted as any).id as number,
      action: 'add',
      action_by: userId as number,
    });
    const row = (inserted as unknown) as Record<string, unknown>;
    const student: StudentRecord = {
      id: row.id as number,
      auth_user_id: row.auth_user_id as string,
      name: row.name as string,
      national_id: row.national_id as string,
      exam_datetime: (row.exam_datetime as string | null) ?? null,
      start_date: (row.start_date as string | null) ?? null,
      registration_date: (row.registration_date as string | null) ?? null,
      last_login_at: (row.last_login_at as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      status: (row.status as string | undefined) ?? 'active',
      show_exams: (row.show_exams as boolean | undefined) ?? true,
      teacher_id: row.teacher_id as number,
      language: (row.language as string | undefined) ?? 'ar',
      created_at: row.created_at as string,
      updated_at: (row.updated_at as string | null) ?? null,
    };
    try {
      const { data: feeRow } = await supabase
        .from('teacher_accounting_settings')
        .select('per_student_fee')
        .eq('teacher_id', payload.teacher_id)
        .maybeSingle();
      const fee = Number((feeRow?.per_student_fee as number | undefined) ?? 0);
      if (Number.isFinite(fee) && fee > 0) {
        const acc = await addAccountingCharge({
          student_id: student.id,
          teacher_id: payload.teacher_id,
          amount: fee,
        });
        if (acc.ok) {
          try {
            await supabase.from('student_actions').insert({
              student_id: student.id,
              action: 'acc_add_on_create',
              action_by: userId as number,
            });
          } catch {}
        }
      }
    } catch {}
    return { ok: true, student };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function deleteStudent(
  studentId: number,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    if (!uid) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const isAdmin = roleNames.includes('admin');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    } else if (!isAdmin) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { error: actDelErr } = await supabase.from('student_actions').delete().eq('student_id', studentId);
    if (actDelErr) {
      return { ok: false, error: actDelErr.message, details: actDelErr };
    }
    const { error: accErr } = await supabase.from('accounting').delete().eq('student_id', studentId);
    if (accErr) {
      return { ok: false, error: accErr.message, details: accErr };
    }
    const { error: delErr } = await supabase.from('students').delete().eq('id', studentId);
    if (delErr) {
      return { ok: false, error: delErr.message, details: delErr };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function passStudentAndDelete(
  studentId: number,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  return deleteStudent(studentId);
}

export async function failStudentResetDetails(
  studentId: number,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    if (!uid) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const isAdmin = roleNames.includes('admin');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    } else if (!isAdmin) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { error: sesErr } = await supabase.from('student_sessions').delete().eq('student_id', studentId);
    if (sesErr) {
      return { ok: false, error: sesErr.message, details: sesErr };
    }
    const { error: resErr } = await supabase.from('exam_results').delete().eq('student_id', studentId);
    if (resErr) {
      return { ok: false, error: resErr.message, details: resErr };
    }
    const { error: actErr } = await supabase.from('student_actions').delete().eq('student_id', studentId);
    if (actErr) {
      return { ok: false, error: actErr.message, details: actErr };
    }
    const { error: updErr } = await supabase.from('students').update({ status: 'failed' }).eq('id', studentId);
    if (updErr) {
      return { ok: false, error: updErr.message, details: updErr };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}
export type UpdateStudentInput = {
  id: number;
  name?: string;
  national_id?: string;
  exam_datetime?: string | Date | null;
  start_date?: string | Date | null;
  registration_date?: string | Date | null;
  last_login_at?: string | Date | null;
  notes?: string | null;
  status?: string;
  show_exams?: boolean;
  teacher_id?: number;
  language?: string;
};

export async function updateStudent(
  input: UpdateStudentInput,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: claims } = await supa.auth.getClaims();
    const hasUser = !!claims?.claims;
    if (!hasUser) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    if (!uid) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const isAdmin = roleNames.includes('admin');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', input.id)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    } else if (!isAdmin) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.national_id !== undefined) payload.national_id = input.national_id;
    if (input.exam_datetime !== undefined) payload.exam_datetime = input.exam_datetime;
    if (input.start_date !== undefined) payload.start_date = input.start_date;
    if (input.registration_date !== undefined)
      payload.registration_date = input.registration_date;
    if (input.last_login_at !== undefined) payload.last_login_at = input.last_login_at;
    if (input.notes !== undefined) payload.notes = input.notes;
    if (input.status !== undefined) payload.status = input.status;
    if (input.show_exams !== undefined) payload.show_exams = input.show_exams;
    if (input.teacher_id !== undefined) payload.teacher_id = input.teacher_id;
    if (input.language !== undefined) payload.language = input.language;
    const { error } = await supabase.from('students').update(payload).eq('id', input.id);
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    await supabase.from('student_actions').insert({
      student_id: input.id,
      action: 'update',
      action_by: userId as number,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function deleteStudentDevices(
  studentId: number,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: claims } = await supa.auth.getClaims();
    if (!claims?.claims) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    if (!uid) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const isAdmin = roleNames.includes('admin');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    } else if (!isAdmin) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { error } = await supabase.from('student_devices').delete().eq('student_id', studentId);
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    await supabase.from('student_actions').insert({
      student_id: studentId,
      action: 'delete_devices',
      action_by: userId as number,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function countStudents(input?: {
  registration_from?: string;
  registration_to?: string;
}): Promise<{ ok: true; total: number } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    let builder = supabase.from('students').select('id', { count: 'exact' });
    if (input?.registration_from) builder = builder.gte('registration_date', input.registration_from);
    if (input?.registration_to) {
      const d = new Date(String(input.registration_to).replace('+00:00', 'Z'));
      d.setUTCHours(23, 59, 59, 999);
      const toIso = d.toISOString().replace('Z', '+00:00');
      builder = builder.lte('registration_date', toIso);
    }
    const { error, count } = await builder;
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    return { ok: true, total: count ?? 0 };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export type StudentStatusCounts = {
  active: number;
  inactive: number;
  passed: number;
  failed: number;
  total: number;
};

export async function countStudentsByStatusForCurrentTeacher(): Promise<
  | { ok: true; counts: StudentStatusCounts }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const supa = await createServerClient();
    const { data: claims } = await supa.auth.getClaims();
    const hasUser = !!claims?.claims;
    if (!hasUser) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    if (!uid) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    if (!userId) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    if (!roleNames.includes('teacher')) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('students')
      .select('status')
      .eq('teacher_id', userId);
    if (error) {
      return { ok: false, error: error.message, details: error };
    }

    const counts: StudentStatusCounts = {
      active: 0,
      inactive: 0,
      passed: 0,
      failed: 0,
      total: 0,
    };
    for (const row of data ?? []) {
      const status = (row as { status?: string }).status ?? 'inactive';
      if (status === 'active') counts.active += 1;
      else if (status === 'inactive') counts.inactive += 1;
      else if (status === 'passed') counts.passed += 1;
      else if (status === 'failed') counts.failed += 1;
      else counts.inactive += 1;
      counts.total += 1;
    }
    return { ok: true, counts };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export type StudentProfile = {
  id: number;
  auth_user_id: string;
  name: string;
  national_id: string;
  status: string;
  show_exams: boolean;
  teacher_id: number;
  created_at: string;
  last_login_at: string | null;
};

export type ExamListItem = {
  id: number;
  title: string;
  language: string;
  duration_minutes: number;
};

export type SessionListItem = {
  id: number;
  title: string;
  video_url: string;
  language: string;
  order_number: number | null;
};

export type ExamResultItem = {
  exam_id: number;
  score: number;
  duration_minutes: number | null;
  taken_at: string;
  exam_title?: string;
};

export type StudentProgressOverview = {
  totalStudyMinutes: number;
  examsTaken: number;
  lastScore: number | null;
  expectedScore: number | null;
};

export async function getStudentProfile(
  studentId: number,
): Promise<{ ok: true; profile: StudentProfile } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    }
    const { data, error } = await supabase
      .from('students')
      .select('id,auth_user_id,name,national_id,status,show_exams,teacher_id,created_at,last_login_at')
      .eq('id', studentId)
      .maybeSingle();
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    if (!data) {
      return { ok: false, error: 'الطالب غير موجود' };
    }
    const r = (data as unknown) as Record<string, unknown>;
    const profile: StudentProfile = {
      id: r.id as number,
      auth_user_id: r.auth_user_id as string,
      name: r.name as string,
      national_id: r.national_id as string,
      status: (r.status as string | undefined) ?? 'active',
      show_exams: (r.show_exams as boolean | undefined) ?? true,
      teacher_id: r.teacher_id as number,
      created_at: r.created_at as string,
      last_login_at: (r.last_login_at as string | null) ?? null,
    };
    return { ok: true, profile };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function listStudentAvailableExams(
  studentId: number,
): Promise<{ ok: true; exams: ExamListItem[] } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    }
    const { data: srow, error: sErr } = await supabase
      .from('students')
      .select('show_exams,status')
      .eq('id', studentId)
      .maybeSingle();
    if (sErr) {
      return { ok: false, error: sErr.message, details: sErr };
    }
    const sInfo = (srow as unknown) as Record<string, unknown> | null;
    if (!sInfo || (sInfo.status as string | undefined) !== 'active') {
      return { ok: false, error: 'حساب الطالب غير نشط' };
    }
    const show = ((sInfo as Record<string, unknown>).show_exams as boolean | undefined) === true;
    if (!show) {
      return { ok: true, exams: [] };
    }
    const { data, error } = await supabase
      .from('exams')
      .select('id,title,language,duration_minutes')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const exams: ExamListItem[] = (data ?? []).map((row) => {
      const r = (row as unknown) as Record<string, unknown>;
      return {
        id: r.id as number,
        title: r.title as string,
        language: r.language as string,
        duration_minutes: r.duration_minutes as number,
      };
    });
    return { ok: true, exams };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function listStudentActiveSessions(
  studentId: number,
): Promise<{ ok: true; sessions: SessionListItem[] } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    }
    const { data: srow, error: sErr } = await supabase
      .from('students')
      .select('status')
      .eq('id', studentId)
      .maybeSingle();
    if (sErr) {
      return { ok: false, error: sErr.message, details: sErr };
    }
    const sInfo = (srow as unknown) as Record<string, unknown> | null;
    if (!sInfo || (sInfo.status as string | undefined) !== 'active') {
      return { ok: false, error: 'حساب الطالب غير نشط' };
    }
    const { data, error } = await supabase
      .from('sessions')
      .select('id,title,video_url,language,order_number')
      .eq('is_active', true)
      .order('order_number', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const sessions: SessionListItem[] = (data ?? []).map((row) => {
      const r = (row as unknown) as Record<string, unknown>;
      return {
        id: r.id as number,
        title: r.title as string,
        video_url: r.video_url as string,
        language: r.language as string,
        order_number: (r.order_number as number | null) ?? null,
      };
    });
    return { ok: true, sessions };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function listStudentExamResults(
  studentId: number,
): Promise<{ ok: true; results: ExamResultItem[] } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    }
    const { data, error } = await supabase
      .from('exam_results')
      .select('exam_id,score,duration_minutes,taken_at')
      .eq('student_id', studentId)
      .order('taken_at', { ascending: false });
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const base: ExamResultItem[] = (data ?? []).map((row) => {
      const r = (row as unknown) as Record<string, unknown>;
      return {
        exam_id: r.exam_id as number,
        score: Math.max(0, Math.min(100, Math.round(Number(r.score)))),
        duration_minutes: (r.duration_minutes as number | null) ?? null,
        taken_at: r.taken_at as string,
      };
    });
    const ids = Array.from(new Set(base.map((b) => b.exam_id)));
    if (ids.length > 0) {
      const { data: examsRows, error: exErr } = await supabase
        .from('exams')
        .select('id,title')
        .in('id', ids);
      if (!exErr) {
        const titleById = new Map<number, string>();
        for (const e of examsRows ?? []) {
          const er = (e as unknown) as Record<string, unknown>;
          titleById.set(er.id as number, er.title as string);
        }
        for (const r of base) r.exam_title = titleById.get(r.exam_id);
      }
    }
    return { ok: true, results: base };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function getStudentProgressOverview(
  studentId: number,
): Promise<{ ok: true; progress: StudentProgressOverview } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    }
    const [ses, res] = await Promise.all([
      supabase.from('student_sessions').select('duration_minutes').eq('student_id', studentId),
      supabase
        .from('exam_results')
        .select('score,taken_at')
        .eq('student_id', studentId)
        .order('taken_at', { ascending: false }),
    ]);
    if (ses.error) {
      return { ok: false, error: ses.error.message, details: ses.error };
    }
    if (res.error) {
      return { ok: false, error: res.error.message, details: res.error };
    }
    let total = 0;
    for (const s of ses.data ?? []) {
      const sr = (s as unknown) as Record<string, unknown>;
      const n = Number(sr.duration_minutes);
      total += Number.isFinite(n) ? n : 0;
    }
    const scores: Array<number | null> = [];
    for (const row of res.data ?? []) {
      const rr = (row as unknown) as Record<string, unknown>;
      const n = Number(rr.score);
      scores.push(Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null);
    }
    const clean = scores.filter((v): v is number => typeof v === 'number');
    const last = clean.length > 0 ? clean[0] : null;
    const expected = clean.length > 0 ? Math.round(clean.reduce((a, b) => a + b, 0) / clean.length) : null;
    return {
      ok: true,
      progress: {
        totalStudyMinutes: total,
        examsTaken: clean.length,
        lastScore: last,
        expectedScore: expected,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function getStudentPortalData(
  studentId: number,
): Promise<
  | {
      ok: true;
      profile: StudentProfile;
      exams: ExamListItem[];
      sessions: SessionListItem[];
      progress: StudentProgressOverview;
      results: ExamResultItem[];
    }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const [profileRes, examsRes, sessionsRes, progressRes, resultsRes] = await Promise.all([
      getStudentProfile(studentId),
      listStudentAvailableExams(studentId),
      listStudentActiveSessions(studentId),
      getStudentProgressOverview(studentId),
      listStudentExamResults(studentId),
    ]);
    if (!profileRes.ok) return profileRes;
    if (!examsRes.ok) return examsRes;
    if (!sessionsRes.ok) return sessionsRes;
    if (!progressRes.ok) return progressRes;
    if (!resultsRes.ok) return resultsRes;
    return {
      ok: true,
      profile: profileRes.profile,
      exams: examsRes.exams,
      sessions: sessionsRes.sessions,
      progress: progressRes.progress,
      results: resultsRes.results,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function setStudentStatus(
  studentId: number,
  status: string,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    if (!uid) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const isAdmin = roleNames.includes('admin');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    } else if (!isAdmin) {
      return { ok: false, error: 'غير مصرح | Unauthorized' };
    }
    const { error } = await supabase.from('students').update({ status }).eq('id', studentId);
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    await supabase.from('student_actions').insert({
      student_id: studentId,
      action: 'status',
      action_by: userId as number,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export type StudentProgressData = {
  totalStudyMinutes: number;
  examsTaken: number;
  lastScore: number | null;
  expectedScore: number | null;
  allExamsCompleted: boolean;
  allVideosWatched: boolean;
  totalActiveExams: number;
  totalActiveSessions: number;
  sessionsWatched: number;
};

export async function getStudentProgress(
  studentId: number,
): Promise<{ ok: true; progress: StudentProgressData } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    }
    const { data: sessions, error: sesErr } = await supabase
      .from('student_sessions')
      .select('session_id,duration_minutes')
      .eq('student_id', studentId);
    if (sesErr) {
      return { ok: false, error: sesErr.message, details: sesErr };
    }
    const totalStudyMinutes = (sessions ?? []).reduce(
      (acc, s) => acc + (Number((s as any).duration_minutes) || 0),
      0,
    );
    const watchedSessionIds = Array.from(
      new Set(
        (sessions ?? [])
          .map((s) => (s as unknown as { session_id?: number }).session_id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );
    const { data: activeSessions, error: actSesErr } = await supabase
      .from('sessions')
      .select('id')
      .eq('is_active', true);
    if (actSesErr) {
      return { ok: false, error: actSesErr.message, details: actSesErr };
    }
    const totalActiveSessions = (activeSessions ?? []).length;
    const allVideosWatched = totalActiveSessions > 0 && watchedSessionIds.length >= totalActiveSessions;

    const { data: resultsAll, error: resErrAll } = await supabase
      .from('exam_results')
      .select('exam_id,score,taken_at')
      .eq('student_id', studentId)
      .order('taken_at', { ascending: false });
    if (resErrAll) {
      return { ok: false, error: resErrAll.message, details: resErrAll };
    }
    const distinctExams = Array.from(
      new Set(
        (resultsAll ?? [])
          .map((r) => (r as unknown as { exam_id?: number }).exam_id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );
    const lastScore = resultsAll && resultsAll.length > 0 ? (resultsAll[0] as any).score as number : null;
    const { data: activeExams, error: actExErr } = await supabase
      .from('exams')
      .select('id')
      .eq('is_active', true);
    if (actExErr) {
      return { ok: false, error: actExErr.message, details: actExErr };
    }
    const totalActiveExams = (activeExams ?? []).length;
    const allExamsCompleted = totalActiveExams > 0 && distinctExams.length >= totalActiveExams;

    return {
      ok: true,
      progress: {
        totalStudyMinutes,
        examsTaken: distinctExams.length,
        lastScore,
        expectedScore: lastScore,
        allExamsCompleted,
        allVideosWatched,
        totalActiveExams: totalActiveExams,
        totalActiveSessions: totalActiveSessions,
        sessionsWatched: watchedSessionIds.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export type StudentLoginEvent = {
  id: number;
  logged_in_at: string;
  logged_out_at: string | null;
  ip_address: string | null;
};

export async function getStudentLoginHistory(
  studentId: number,
): Promise<{ ok: true; events: StudentLoginEvent[] } | { ok: false; error: string; details?: unknown }> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const supabase = createAdminClient();
    if (isTeacher) {
      const { data: srow } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', studentId)
        .maybeSingle();
      if (!srow || (srow as any).teacher_id !== userId) {
        return { ok: false, error: 'غير مصرح | Unauthorized' };
      }
    }
    const { data, error } = await supabase
      .from('student_logins')
      .select('id,student_id,logged_in_at,logged_out_at,ip_address')
      .eq('student_id', studentId)
      .order('logged_in_at', { ascending: false });
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const events: StudentLoginEvent[] = (data ?? []).map((row) => {
      const r = (row as unknown) as Record<string, unknown>;
      return {
        id: r.id as number,
        logged_in_at: r.logged_in_at as string,
        logged_out_at: (r.logged_out_at as string | null) ?? null,
        ip_address: (r.ip_address as string | null) ?? null,
      };
    });
    return { ok: true, events };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}
export type ListStudentsQuery = {
  status?: string;
  teacher_id?: number;
  search?: string;
  show_exams?: boolean;
  exam_datetime_from?: string | Date;
  exam_datetime_to?: string | Date;
  registration_date_from?: string | Date;
  registration_date_to?: string | Date;
  created_at_from?: string | Date;
  created_at_to?: string | Date;
  sort_by?: 'created_at' | 'name' | 'exam_datetime' | 'registration_date';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
};

export type ListStudentsResult =
  | {
      ok: true;
      students: StudentRecord[];
      page: number;
      perPage: number;
      total: number | null;
    }
  | { ok: false; error: string; details?: unknown; fieldErrors?: Record<string, string> };

/**
 * عرض قائمة الطلاب مع دعم التصفية والترتيب والتقسيم.
 * يُرجع جميع خصائص الطالب وفق المخطط، بالإضافة إلى معلومات التقسيم.
 */
export async function listStudents(
  query: ListStudentsQuery,
): Promise<ListStudentsResult> {
  try {
    const supa = await createServerClient();
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    const { data: usr } = await supa.from('users').select('id').eq('auth_user_id', uid as string).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    const { data: rolesRows } = await supa
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId as number);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    const isTeacher = roleNames.includes('teacher');
    const v = validateListStudentsQuery(query);
    if (!v.ok) {
      return {
        ok: false,
        error: 'فشل التحقق من معايير الاستعلام',
        fieldErrors: (v.errors as unknown) as Record<string, string>,
      };
    }
    const q = v.value as {
      status?: string;
      teacher_id?: number;
      search?: string;
      show_exams?: boolean;
      exam_datetime_from?: string;
      exam_datetime_to?: string;
      registration_date_from?: string;
      registration_date_to?: string;
      created_at_from?: string;
      created_at_to?: string;
      sort_by: 'created_at' | 'name' | 'exam_datetime' | 'registration_date';
      sort_dir: 'asc' | 'desc';
      page: number;
      per_page: number;
    };

    if (isTeacher) {
      q.teacher_id = userId as number;
    }
    const supabase = createAdminClient();
    let builder = supabase
      .from('students')
      .select(
        [
          'id',
          'auth_user_id',
          'name',
          'national_id',
          'exam_datetime',
          'start_date',
          'registration_date',
          'last_login_at',
          'notes',
          'status',
          'show_exams',
          'teacher_id',
          'language',
          'created_at',
          'updated_at',
        ].join(','),
        { count: 'exact' },
      );

    if (q.status) {
      const s = String(q.status).trim().toLowerCase();
      const mapped =
        s === 'الكل' || s === 'كل' || s === 'all'
          ? null
          : s === 'نشط'
          ? 'active'
          : s === 'غير نشط'
          ? 'inactive'
          : s === 'ناجح'
          ? 'passed'
          : s === 'راسب'
          ? 'failed'
          : q.status;
      if (mapped) builder = builder.eq('status', mapped);
    }
    if (q.teacher_id) builder = builder.eq('teacher_id', q.teacher_id);
    if (q.show_exams !== undefined) builder = builder.eq('show_exams', q.show_exams);
    if (q.exam_datetime_from || q.exam_datetime_to) {
      const { exam_datetime_from: edfRaw, exam_datetime_to: edtRaw } = q;
      const edf = edfRaw ? String(edfRaw) : undefined;
      const edt = (() => {
        if (!edtRaw) return undefined;
        const toIso = String(edtRaw);
        const hasTime = /\dT\d/.test(toIso);
        if (hasTime) return toIso;
        const d = new Date(toIso.replace('+00:00', 'Z'));
        d.setUTCHours(23, 59, 59, 999);
        return d.toISOString().replace('Z', '+00:00');
      })();
      let examsQuery = supabase.from('exam_results').select('student_id');
      if (edf) examsQuery = examsQuery.gte('taken_at', edf);
      if (edt) examsQuery = examsQuery.lte('taken_at', edt);
      const { data: examRows, error: examErr } = await examsQuery;
      if (examErr) {
        return { ok: false, error: examErr.message, details: examErr };
      }
      const ids = Array.from(
        new Set(
          (examRows ?? [])
            .map((r) => (r as unknown as { student_id: unknown }).student_id)
            .filter((id) => typeof id === 'number'),
        ),
      ) as number[];
      if (ids.length === 0) {
        return { ok: true, students: [], page: q.page, perPage: q.per_page, total: 0 };
      }
      builder = builder.in('id', ids);
    }
    if (q.registration_date_from) builder = builder.gte('registration_date', q.registration_date_from);
    if (q.registration_date_to) builder = builder.lte('registration_date', q.registration_date_to);
    if (q.created_at_from) builder = builder.gte('created_at', q.created_at_from);
    if (q.created_at_to) builder = builder.lte('created_at', q.created_at_to);
    if (q.search) {
      const term = q.search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      let teacherIds: number[] = [];
      {
        const { data: teacherRows, error: teacherErr } = await supabase
          .from('users')
          .select('id')
          .ilike('name', `%${term}%`);
        if (teacherErr) {
          return { ok: false, error: teacherErr.message, details: teacherErr };
        }
        teacherIds = Array.from(
          new Set(
            (teacherRows ?? [])
              .map((r) => (r as unknown as { id: unknown }).id)
              .filter((id) => typeof id === 'number'),
          ),
        ) as number[];
      }
      const orParts = [`name.ilike.%${term}%`, `national_id.ilike.%${term}%`];
      if (teacherIds.length > 0) {
        orParts.push(`teacher_id.in.(${teacherIds.join(',')})`);
      }
      builder = builder.or(orParts.join(','));
    }

    builder = builder.order(q.sort_by, { ascending: q.sort_dir === 'asc', nullsFirst: false });

    const from = (q.page - 1) * q.per_page;
    const to = from + q.per_page - 1;
    builder = builder.range(from, to);

    const { data, error, count } = await builder;
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const students: StudentRecord[] = (data ?? []).map((row) => {
      const r = (row as unknown) as Record<string, unknown>;
      return {
        id: r.id as number,
        auth_user_id: r.auth_user_id as string,
        name: r.name as string,
        national_id: r.national_id as string,
        exam_datetime: (r.exam_datetime as string | null) ?? null,
        start_date: (r.start_date as string | null) ?? null,
        registration_date: (r.registration_date as string | null) ?? null,
        last_login_at: (r.last_login_at as string | null) ?? null,
        notes: (r.notes as string | null) ?? null,
        status: (r.status as string | undefined) ?? 'active',
        show_exams: (r.show_exams as boolean | undefined) ?? true,
        teacher_id: r.teacher_id as number,
        language: (r.language as string | undefined) ?? 'ar',
        created_at: r.created_at as string,
        updated_at: (r.updated_at as string | null) ?? null,
      };
    });
    return {
      ok: true,
      students,
      page: q.page,
      perPage: q.per_page,
      total: count ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}
