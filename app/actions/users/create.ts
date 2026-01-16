'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { ensureRoleId } from './roles';
import type { CreateUserInput, CreateUserResult, TeacherInput } from './types';

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  try {
    const supabase = createAdminClient();

    const { data: createdUser, error: createAuthError } =
      await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { name: input.name, kind: input.kind },
      });

    if (createAuthError) {
      return { ok: false, error: createAuthError.message };
    }
    const authUserId = createdUser.user?.id;
    if (!authUserId) {
      return { ok: false, error: 'Failed to obtain auth user id' };
    }

    const { data: userInsert, error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUserId,
        name: input.name,
      })
      .select('id')
      .single();
    if (userError) {
      return { ok: false, error: userError.message, details: userError };
    }

    const roleName = input.kind === 'admin' ? 'admin' : 'teacher';
    const roleId = await ensureRoleId(roleName);

    const { error: userRoleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userInsert.id as number,
        role_id: roleId,
      });
    if (userRoleError) {
      return { ok: false, error: userRoleError.message, details: userRoleError };
    }

    if (input.kind === 'teacher') {
      const fee = Number((input as TeacherInput).per_student_fee ?? 0);
      const { error: feeErr } = await supabase
        .from('teacher_accounting_settings')
        .upsert({
          teacher_id: userInsert.id as number,
          per_student_fee: Number.isFinite(fee) && fee >= 0 ? fee : 0,
        })
        .eq('teacher_id', userInsert.id as number);
      if (feeErr) {
        return { ok: false, error: feeErr.message, details: feeErr };
      }
    }

    return {
      ok: true,
      kind: input.kind,
      authUserId,
      userId: userInsert.id as number,
      roleAssigned: roleName,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    };
  }
}
