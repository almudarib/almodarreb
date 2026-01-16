'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { UserDetails, UserKind } from './types';

export async function getUserDetails(
  kind: UserKind,
  id: number,
): Promise<{ ok: true; user: UserDetails } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('users')
      .select('id,name,auth_user_id')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    if (!data) {
      return { ok: false, error: 'User not found' };
    }
    return {
      ok: true,
      user: {
        kind,
        id: data.id as number,
        name: data.name as string,
        auth_user_id: data.auth_user_id as string,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    };
  }
}
