'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  ListUsersGroupedResult,
  ListedUser,
  ListedKindUser,
  UserKind,
} from './types';

export async function ensureRoleId(roleName: 'admin' | 'teacher'): Promise<number> {
  const supabase = createAdminClient();
  const { data: roleQuery, error: roleQueryError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .limit(1)
    .maybeSingle();
  if (roleQueryError) {
    throw roleQueryError;
  }
  if (roleQuery?.id) {
    return roleQuery.id as number;
  }
  const { data: inserted, error: insertError } = await supabase
    .from('roles')
    .insert({ name: roleName })
    .select('id')
    .single();
  if (insertError) {
    throw insertError;
  }
  return inserted.id as number;
}

export async function listUsersGroupedByRole(): Promise<ListUsersGroupedResult> {
  try {
    const supabase = createAdminClient();

    const { data: rolesRows, error: rolesError } = await supabase
      .from('roles')
      .select('id,name')
      .in('name', ['admin', 'teacher']);
    if (rolesError) {
      return { ok: false, error: rolesError.message, details: rolesError };
    }

    const roleIdsByName: Record<'admin' | 'teacher', number | undefined> = {
      admin: rolesRows?.find((r) => r.name === 'admin')?.id as number | undefined,
      teacher: rolesRows?.find((r) => r.name === 'teacher')?.id as number | undefined,
    };

    const existingRoleIds = Object.values(roleIdsByName).filter(
      (v): v is number => typeof v === 'number',
    );

    if (existingRoleIds.length === 0) {
      return { ok: true, admin: [], teacher: [] };
    }

    const { data: userRolesRows, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id,role_id')
      .in('role_id', existingRoleIds);
    if (userRolesError) {
      return { ok: false, error: userRolesError.message, details: userRolesError };
    }

    const allUserIds = Array.from(
      new Set((userRolesRows ?? []).map((ur) => ur.user_id as number)),
    );

    if (allUserIds.length === 0) {
      return { ok: true, admin: [], teacher: [] };
    }

    const { data: usersRows, error: usersError } = await supabase
      .from('users')
      .select('id,name,auth_user_id')
      .in('id', allUserIds);
    if (usersError) {
      return { ok: false, error: usersError.message, details: usersError };
    }

    const userById = new Map<number, ListedUser>(
      (usersRows ?? []).map((u) => [
        u.id as number,
        {
          id: u.id as number,
          name: u.name as string,
          auth_user_id: u.auth_user_id as string,
        },
      ]),
    );

    const adminUsers: ListedUser[] = [];
    const teacherUsers: ListedUser[] = [];

    for (const ur of userRolesRows ?? []) {
      const u = userById.get(ur.user_id as number);
      if (!u) continue;
      if (ur.role_id === roleIdsByName.admin) {
        adminUsers.push(u);
        continue;
      }
      if (ur.role_id === roleIdsByName.teacher) {
        teacherUsers.push(u);
        continue;
      }
    }

    return { ok: true, admin: adminUsers, teacher: teacherUsers };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    };
  }
}

export async function listUsersByKind(
  kind: UserKind,
): Promise<
  | { ok: true; users: ListedKindUser[] }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const grouped = await listUsersGroupedByRole();
    if (!grouped.ok) {
      return { ok: false, error: grouped.error, details: grouped.details };
    }
    const src = kind === 'admin' ? grouped.admin : grouped.teacher;
    return {
      ok: true,
      users: src.map((u) => ({ id: u.id, name: u.name, kind })),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    };
  }
}
