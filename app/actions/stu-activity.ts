'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type SessionEntryInput = {
  student_id: number;
  session_id: number;
  opened_at?: string | Date;
  duration_minutes?: number;
};

export type ExamResultInput = {
  student_id: number;
  exam_id: number;
  score: number;
  duration_minutes?: number | null;
  taken_at?: string | Date;
};

export type StudyStats = {
  totalStudyMinutes: number;
  sessionsCount: number;
};

export type ExamStats = {
  examsTaken: number;
  lastScore: number | null;
  expectedScore: number | null;
};

function toISODateTime(v: string | Date | undefined) {
  if (v === undefined || v === null || v === '') return undefined;
  const d = v instanceof Date ? v : new Date(String(v));
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().replace('Z', '+00:00');
}

export async function logStudentSession(
  entry: SessionEntryInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string; fieldErrors?: Record<string, string>; details?: unknown }> {
  try {
    const errors: Record<string, string> = {};
    if (!Number.isInteger(entry?.student_id) || (entry?.student_id as number) <= 0) {
      errors.student_id = 'student_id غير صالح';
    }
    if (!Number.isInteger(entry?.session_id) || (entry?.session_id as number) <= 0) {
      errors.session_id = 'session_id غير صالح';
    }
    const opened_at = toISODateTime(entry?.opened_at);
    if (entry?.opened_at !== undefined && !opened_at) {
      errors.opened_at = 'opened_at غير صالح';
    }
    let duration = entry?.duration_minutes;
    if (duration !== undefined) {
      const n = Number(duration);
      if (!Number.isFinite(n) || n < 0) errors.duration_minutes = 'duration_minutes غير صالح';
      else duration = Math.floor(n);
    }
    if (Object.keys(errors).length > 0) {
      return { ok: false, error: 'فشل التحقق من البيانات', fieldErrors: errors };
    }
    const supabase = createAdminClient();
    const payload: Record<string, unknown> = {
      student_id: entry.student_id,
      session_id: entry.session_id,
    };
    if (opened_at) payload.opened_at = opened_at;
    if (duration !== undefined) payload.duration_minutes = duration;
    const { data, error } = await supabase
      .from('student_sessions')
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const r = (data as unknown) as Record<string, unknown>;
    return { ok: true, id: r.id as number };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'حدث خطأ غير معروف', details: error };
  }
}

export async function bulkLogStudentSessions(
  entries: SessionEntryInput[],
): Promise<{ ok: true; inserted: number } | { ok: false; error: string; fieldErrors?: Record<number, Record<string, string>>; details?: unknown }> {
  try {
    const fieldErrors: Record<number, Record<string, string>> = {};
    const payload: Record<string, unknown>[] = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const errors: Record<string, string> = {};
      if (!Number.isInteger(e?.student_id) || (e?.student_id as number) <= 0) {
        errors.student_id = 'student_id غير صالح';
      }
      if (!Number.isInteger(e?.session_id) || (e?.session_id as number) <= 0) {
        errors.session_id = 'session_id غير صالح';
      }
      const opened_at = toISODateTime(e?.opened_at);
      if (e?.opened_at !== undefined && !opened_at) {
        errors.opened_at = 'opened_at غير صالح';
      }
      let duration = e?.duration_minutes;
      if (duration !== undefined) {
        const n = Number(duration);
        if (!Number.isFinite(n) || n < 0) errors.duration_minutes = 'duration_minutes غير صالح';
        else duration = Math.floor(n);
      }
      if (Object.keys(errors).length > 0) {
        fieldErrors[i] = errors;
        continue;
      }
      const p: Record<string, unknown> = {
        student_id: e.student_id,
        session_id: e.session_id,
      };
      if (opened_at) p.opened_at = opened_at;
      if (duration !== undefined) p.duration_minutes = duration;
      payload.push(p);
    }
    if (payload.length === 0) {
      return { ok: false, error: 'لا توجد بيانات صالحة', fieldErrors };
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('student_sessions').insert(payload).select('id');
    if (error) {
      return { ok: false, error: error.message, details: error, fieldErrors };
    }
    return { ok: true, inserted: (data ?? []).length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'حدث خطأ غير معروف', details: error };
  }
}

export async function recordExamResult(
  input: ExamResultInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string; fieldErrors?: Record<string, string>; details?: unknown }> {
  try {
    const errors: Record<string, string> = {};
    if (!Number.isInteger(input?.student_id) || (input?.student_id as number) <= 0) {
      errors.student_id = 'student_id غير صالح';
    }
    if (!Number.isInteger(input?.exam_id) || (input?.exam_id as number) <= 0) {
      errors.exam_id = 'exam_id غير صالح';
    }
    const s = Number(input?.score);
    if (!Number.isFinite(s) || s < 0 || s > 100) {
      errors.score = 'score يجب أن يكون بين 0 و100';
    }
    let duration = input?.duration_minutes ?? null;
    if (duration !== null && duration !== undefined) {
      const n = Number(duration);
      if (!Number.isFinite(n) || n < 0) errors.duration_minutes = 'duration_minutes غير صالح';
      else duration = Math.floor(n);
    }
    const taken_at = toISODateTime(input?.taken_at);
    if (input?.taken_at !== undefined && !taken_at) {
      errors.taken_at = 'taken_at غير صالح';
    }
    if (Object.keys(errors).length > 0) {
      return { ok: false, error: 'فشل التحقق من البيانات', fieldErrors: errors };
    }
    const supabase = createAdminClient();
    const payload: Record<string, unknown> = {
      student_id: input.student_id,
      exam_id: input.exam_id,
      score: Math.round(s),
    };
    if (duration !== null && duration !== undefined) payload.duration_minutes = duration;
    if (taken_at) payload.taken_at = taken_at;
    const { data, error } = await supabase.from('exam_results').insert(payload).select('id').single();
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const r = (data as unknown) as Record<string, unknown>;
    return { ok: true, id: r.id as number };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'حدث خطأ غير معروف', details: error };
  }
}

export async function bulkRecordExamResults(
  entries: ExamResultInput[],
): Promise<{ ok: true; inserted: number } | { ok: false; error: string; fieldErrors?: Record<number, Record<string, string>>; details?: unknown }> {
  try {
    const fieldErrors: Record<number, Record<string, string>> = {};
    const payload: Record<string, unknown>[] = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const errors: Record<string, string> = {};
      if (!Number.isInteger(e?.student_id) || (e?.student_id as number) <= 0) errors.student_id = 'student_id غير صالح';
      if (!Number.isInteger(e?.exam_id) || (e?.exam_id as number) <= 0) errors.exam_id = 'exam_id غير صالح';
      const s = Number(e?.score);
      if (!Number.isFinite(s) || s < 0 || s > 100) errors.score = 'score يجب أن يكون بين 0 و100';
      let duration = e?.duration_minutes ?? null;
      if (duration !== null && duration !== undefined) {
        const n = Number(duration);
        if (!Number.isFinite(n) || n < 0) errors.duration_minutes = 'duration_minutes غير صالح';
        else duration = Math.floor(n);
      }
      const taken_at = toISODateTime(e?.taken_at);
      if (e?.taken_at !== undefined && !taken_at) errors.taken_at = 'taken_at غير صالح';
      if (Object.keys(errors).length > 0) {
        fieldErrors[i] = errors;
        continue;
      }
      const p: Record<string, unknown> = {
        student_id: e.student_id,
        exam_id: e.exam_id,
        score: Math.round(s),
      };
      if (duration !== null && duration !== undefined) p.duration_minutes = duration;
      if (taken_at) p.taken_at = taken_at;
      payload.push(p);
    }
    if (payload.length === 0) return { ok: false, error: 'لا توجد بيانات صالحة', fieldErrors };
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('exam_results').insert(payload).select('id');
    if (error) return { ok: false, error: error.message, details: error, fieldErrors };
    return { ok: true, inserted: (data ?? []).length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'حدث خطأ غير معروف', details: error };
  }
}

export async function getStudentStudyStats(
  studentId: number,
): Promise<{ ok: true; stats: StudyStats } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('student_sessions')
      .select('duration_minutes')
      .eq('student_id', studentId);
    if (error) return { ok: false, error: error.message, details: error };
    const durations = (data ?? []).map((row) => {
      const r = (row as unknown) as Record<string, unknown>;
      const n = Number(r.duration_minutes);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    });
    const total = durations.reduce((acc, v) => acc + v, 0);
    const stats: StudyStats = { totalStudyMinutes: total, sessionsCount: durations.length };
    return { ok: true, stats };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'حدث خطأ غير معروف', details: error };
  }
}

export async function getStudentExamStats(
  studentId: number,
): Promise<{ ok: true; stats: ExamStats } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exam_results')
      .select('score,taken_at')
      .eq('student_id', studentId)
      .order('taken_at', { ascending: false });
    if (error) return { ok: false, error: error.message, details: error };
    const scores = (data ?? []).map((row) => {
      const r = (row as unknown) as Record<string, unknown>;
      const n = Number(r.score);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
    });
    const cleanScores = scores.filter((s): s is number => typeof s === 'number');
    const lastScore = cleanScores.length > 0 ? cleanScores[0] : null;
    const expected = cleanScores.length > 0 ? Math.round(cleanScores.reduce((a, b) => a + b, 0) / cleanScores.length) : null;
    const stats: ExamStats = { examsTaken: cleanScores.length, lastScore, expectedScore: expected };
    return { ok: true, stats };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'حدث خطأ غير معروف', details: error };
  }
}

export async function getStudentActivityOverview(
  studentId: number,
): Promise<
  | { ok: true; overview: StudyStats & ExamStats }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const a = await getStudentStudyStats(studentId);
    if (!a.ok) return a;
    const b = await getStudentExamStats(studentId);
    if (!b.ok) return b;
    const overview = { ...a.stats, ...b.stats };
    return { ok: true, overview };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'حدث خطأ غير معروف', details: error };
  }
}

