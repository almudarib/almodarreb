'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { countStudents } from '@/app/actions/students';
import { countExams, countQuestions } from '@/app/actions/exam';
import { countSessions } from '@/app/actions/video';
import { listTeacherAccountingStats, type TeacherAccountingStats } from '@/app/actions/accounting';

export type DashboardStats = {
  teachers: number;
  admins: number;
  students: number;
  exams: number;
  videos: number;
  questions: number;
};

export async function getDashboardStats(input?: {
  from?: string;
  to?: string;
}): Promise<
  | { ok: true; stats: DashboardStats; accStats: TeacherAccountingStats[] }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const supabase = createAdminClient();

    const { data: rolesRows, error: rolesErr } = await supabase
      .from('roles')
      .select('id,name')
      .in('name', ['admin', 'teacher']);
    if (rolesErr) {
      return { ok: false, error: rolesErr.message, details: rolesErr };
    }
    const adminRoleId = (rolesRows ?? []).find((r) => (r as any).name === 'admin')?.id as number | undefined;
    const teacherRoleId = (rolesRows ?? []).find((r) => (r as any).name === 'teacher')?.id as number | undefined;

    let adminsTotal = 0;
    let teachersTotal = 0;
    if (adminRoleId) {
      const { count: admCount, error: admErr } = await supabase
        .from('user_roles')
        .select('user_id', { count: 'exact' })
        .eq('role_id', adminRoleId);
      if (admErr) {
        return { ok: false, error: admErr.message, details: admErr };
      }
      adminsTotal = admCount ?? 0;
    }
    if (teacherRoleId) {
      const { count: tchCount, error: tchErr } = await supabase
        .from('user_roles')
        .select('user_id', { count: 'exact' })
        .eq('role_id', teacherRoleId);
      if (tchErr) {
        return { ok: false, error: tchErr.message, details: tchErr };
      }
      teachersTotal = tchCount ?? 0;
    }

    const [studentsRes, examsRes, videosRes, questionsRes, accRes] = await Promise.all([
      countStudents({ registration_from: input?.from, registration_to: input?.to }),
      countExams({ created_from: input?.from, created_to: input?.to }),
      countSessions({ kind: 'video', created_from: input?.from, created_to: input?.to }),
      countQuestions(),
      listTeacherAccountingStats({ from: input?.from, to: input?.to }),
    ]);

    if (!studentsRes.ok || !examsRes.ok || !videosRes.ok || !questionsRes.ok || !accRes.ok) {
      const err =
        (!studentsRes.ok && studentsRes.error) ||
        (!examsRes.ok && examsRes.error) ||
        (!videosRes.ok && videosRes.error) ||
        (!questionsRes.ok && questionsRes.error) ||
        (!accRes.ok && accRes.error) ||
        'فشل تحميل البيانات';
      return { ok: false, error: err };
    }

    const stats: DashboardStats = {
      teachers: teachersTotal,
      admins: adminsTotal,
      students: studentsRes.total ?? 0,
      exams: examsRes.total ?? 0,
      videos: videosRes.total ?? 0,
      questions: questionsRes.total ?? 0,
    };

    return { ok: true, stats, accStats: accRes.stats ?? [] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

