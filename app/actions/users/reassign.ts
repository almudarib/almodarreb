'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function reassignTeacherStudents(
  fromTeacherId: number,
  toTeacherId: number,
): Promise<{ ok: true; updated: number } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    if (fromTeacherId === toTeacherId) {
      return { ok: false, error: 'Same teacher id' };
    }
    const { data: tExists, error: tErr } = await supabase.from('users').select('id').eq('id', toTeacherId).maybeSingle();
    if (tErr) {
      return { ok: false, error: tErr.message, details: tErr };
    }
    if (!tExists?.id) {
      return { ok: false, error: 'Target teacher not found' };
    }
    const { count: beforeCount, error: cntErr } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', fromTeacherId);
    if (cntErr) {
      return { ok: false, error: cntErr.message, details: cntErr };
    }
    const { error: updErr } = await supabase
      .from('students')
      .update({ teacher_id: toTeacherId })
      .eq('teacher_id', fromTeacherId);
    if (updErr) {
      return { ok: false, error: updErr.message, details: updErr };
    }
    return { ok: true, updated: beforeCount ?? 0 };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    };
  }
}
