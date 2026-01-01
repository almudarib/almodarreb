'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  validateAddStudentInput,
  validateListStudentsQuery,
} from '@/lib/validation/students';

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
      teacher_id: number;
      create_auth?: { email: string; password: string };
    };

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
          'created_at',
          'updated_at',
        ].join(','),
      )
      .single();
    if (insertErr) {
      return { ok: false, error: insertErr.message, details: insertErr };
    }
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
      created_at: row.created_at as string,
      updated_at: (row.updated_at as string | null) ?? null,
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
};

export async function updateStudent(
  input: UpdateStudentInput,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
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
    const { error } = await supabase.from('students').update(payload).eq('id', input.id);
    if (error) {
      return { ok: false, error: error.message, details: error };
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

export async function deleteStudentDevices(
  studentId: number,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('student_devices').delete().eq('student_id', studentId);
    if (error) {
      return { ok: false, error: error.message, details: error };
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

export async function setStudentStatus(
  studentId: number,
  status: string,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('students').update({ status }).eq('id', studentId);
    if (error) {
      return { ok: false, error: error.message, details: error };
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

export type StudentProgressData = {
  totalStudyMinutes: number;
  examsTaken: number;
  lastScore: number | null;
  expectedScore: number | null;
};

export async function getStudentProgress(
  studentId: number,
): Promise<{ ok: true; progress: StudentProgressData } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data: sessions, error: sesErr } = await supabase
      .from('student_sessions')
      .select('duration_minutes')
      .eq('student_id', studentId);
    if (sesErr) {
      return { ok: false, error: sesErr.message, details: sesErr };
    }
    const totalStudyMinutes = (sessions ?? []).reduce(
      (acc, s) => acc + (Number(s.duration_minutes) || 0),
      0,
    );

    const { data: results, error: resErr } = await supabase
      .from('exam_results')
      .select('score,taken_at')
      .eq('student_id', studentId)
      .order('taken_at', { ascending: false })
      .limit(1);
    if (resErr) {
      return { ok: false, error: resErr.message, details: resErr };
    }
    const latest = results && results.length > 0 ? results[0] : null;
    const lastScore = latest ? (latest.score as number) : null;

    return {
      ok: true,
      progress: {
        totalStudyMinutes,
        examsTaken: results ? results.length : 0,
        lastScore,
        expectedScore: lastScore,
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

export type ListStudentsQuery = {
  status?: string;
  teacher_id?: number;
  search?: string;
  show_exams?: boolean;
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
      registration_date_from?: string;
      registration_date_to?: string;
      created_at_from?: string;
      created_at_to?: string;
      sort_by: 'created_at' | 'name' | 'exam_datetime' | 'registration_date';
      sort_dir: 'asc' | 'desc';
      page: number;
      per_page: number;
    };

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
          'created_at',
          'updated_at',
        ].join(','),
        { count: 'exact' },
      );

    if (q.status) builder = builder.eq('status', q.status);
    if (q.teacher_id) builder = builder.eq('teacher_id', q.teacher_id);
    if (q.show_exams !== undefined) builder = builder.eq('show_exams', q.show_exams);
    if (q.registration_date_from) builder = builder.gte('registration_date', q.registration_date_from);
    if (q.registration_date_to) builder = builder.lte('registration_date', q.registration_date_to);
    if (q.created_at_from) builder = builder.gte('created_at', q.created_at_from);
    if (q.created_at_to) builder = builder.lte('created_at', q.created_at_to);
    if (q.search) {
      const term = q.search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      builder = builder.or(`name.ilike.%${term}%,national_id.ilike.%${term}%`);
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
