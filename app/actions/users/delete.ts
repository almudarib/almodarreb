'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { UserKind } from './types';

export async function deleteUserByKind(
  kind: UserKind,
  id: number,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data: u, error: selError } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('id', id)
      .maybeSingle();
    if (selError) {
      return { ok: false, error: selError.message, details: selError };
    }
    if (!u?.auth_user_id) {
      return { ok: false, error: 'User auth user not found' };
    }
    if (kind === 'teacher') {
      const { data: sIdsRows, error: sIdsErr } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', id);
      if (sIdsErr) {
        return { ok: false, error: sIdsErr.message, details: sIdsErr };
      }
      const studentIds = (sIdsRows ?? []).map((r) => r.id as number).filter((v): v is number => typeof v === 'number');
      if (studentIds.length > 0) {
        const { error: sesErr } = await supabase.from('student_sessions').delete().in('student_id', studentIds);
        if (sesErr) {
          return { ok: false, error: sesErr.message, details: sesErr };
        }
        const { error: resErr } = await supabase.from('exam_results').delete().in('student_id', studentIds);
        if (resErr) {
          return { ok: false, error: resErr.message, details: resErr };
        }
        const { error: actErr } = await supabase.from('student_actions').delete().in('student_id', studentIds);
        if (actErr) {
          return { ok: false, error: actErr.message, details: actErr };
        }
        const { error: devErr } = await supabase.from('student_devices').delete().in('student_id', studentIds);
        if (devErr) {
          return { ok: false, error: devErr.message, details: devErr };
        }
        const { error: accErr } = await supabase.from('accounting').delete().eq('teacher_id', id);
        if (accErr) {
          return { ok: false, error: accErr.message, details: accErr };
        }
        const { error: stuDelErr } = await supabase.from('students').delete().eq('teacher_id', id);
        if (stuDelErr) {
          return { ok: false, error: stuDelErr.message, details: stuDelErr };
        }
      }
      const { error: delSettingsErr } = await supabase
        .from('teacher_accounting_settings')
        .delete()
        .eq('teacher_id', id);
      if (delSettingsErr) {
        return { ok: false, error: delSettingsErr.message, details: delSettingsErr };
      }
    }
    const { error: delRolesErr } = await supabase.from('user_roles').delete().eq('user_id', id);
    if (delRolesErr) {
      return { ok: false, error: delRolesErr.message, details: delRolesErr };
    }
    const { error: delUserRowErr } = await supabase.from('users').delete().eq('id', id);
    if (delUserRowErr) {
      return { ok: false, error: delUserRowErr.message, details: delUserRowErr };
    }
    const { error: delAuthErr } = await supabase.auth.admin.deleteUser(u.auth_user_id as string);
    if (delAuthErr) {
      return { ok: false, error: delAuthErr.message, details: delAuthErr };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    };
  }
}
