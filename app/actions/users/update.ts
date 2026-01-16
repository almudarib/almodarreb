'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { ensureRoleId } from './roles';
import type { UpdateUserInput } from './types';

export async function updateUser(
  input: UpdateUserInput,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data: userRow, error: userSelErr } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('id', input.id)
      .maybeSingle();
    if (userSelErr) {
      return { ok: false, error: userSelErr.message, details: userSelErr };
    }
    const authId = userRow?.auth_user_id as string | undefined;
    if (!authId) {
      return { ok: false, error: 'Auth user id not found' };
    }

    if (input.name !== undefined) {
      const { error: updErr } = await supabase.from('users').update({ name: input.name }).eq('id', input.id);
      if (updErr) {
        return { ok: false, error: updErr.message, details: updErr };
      }
    }

    if (input.kind) {
      const roleId = await ensureRoleId(input.kind);
      const { error: roleUpdErr } = await supabase
        .from('user_roles')
        .update({ role_id: roleId })
        .eq('user_id', input.id);
      if (roleUpdErr) {
        return { ok: false, error: roleUpdErr.message, details: roleUpdErr };
      }
    }

    const updateAttrs: Record<string, unknown> = {
      user_metadata: { name: input.name, kind: input.kind },
    };
    if (input.email !== undefined) {
      updateAttrs.email = input.email;
      (updateAttrs as any).email_confirm = true;
    }
    if (input.password !== undefined && input.password.length > 0) updateAttrs.password = input.password;
    if (Object.keys(updateAttrs).length > 1) {
      const { error: authUpdErr } = await supabase.auth.admin.updateUserById(authId, updateAttrs as any);
      if (authUpdErr) {
        return { ok: false, error: authUpdErr.message, details: authUpdErr };
      }
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
