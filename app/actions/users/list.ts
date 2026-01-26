'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { UserSummary } from './types';

export async function listAllUsersSummary(): Promise<
  | { ok: true; users: UserSummary[] }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const supabase = createAdminClient();

    const { data: rolesRows, error: rolesError } = await supabase
      .from('roles')
      .select('id,name')
      .in('name', ['admin', 'sub_admin', 'teacher']);
    if (rolesError) {
      return { ok: false, error: rolesError.message, details: rolesError };
    }

    const roleIdsByName: Record<'admin' | 'sub_admin' | 'teacher', number | undefined> = {
      admin: rolesRows?.find((r) => r.name === 'admin')?.id as number | undefined,
      sub_admin: rolesRows?.find((r) => r.name === 'sub_admin')?.id as number | undefined,
      teacher: rolesRows?.find((r) => r.name === 'teacher')?.id as number | undefined,
    };
    const existingRoleIds = Object.values(roleIdsByName).filter(
      (v): v is number => typeof v === 'number',
    );

    const usersWithRoles: Array<{
      id: number;
      name: string;
      kind: 'admin' | 'sub_admin' | 'teacher';
      auth_user_id: string;
    }> = [];

    if (existingRoleIds.length > 0) {
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

      if (allUserIds.length > 0) {
        const { data: usersRows, error: usersError } = await supabase
          .from('users')
          .select('id,name,auth_user_id')
          .in('id', allUserIds);
        if (usersError) {
          return { ok: false, error: usersError.message, details: usersError };
        }

        const userById = new Map<number, { name: string; auth_user_id: string }>(
          (usersRows ?? []).map((u) => [
            u.id as number,
            { name: u.name as string, auth_user_id: u.auth_user_id as string },
          ]),
        );

        for (const ur of userRolesRows ?? []) {
          const info = userById.get(ur.user_id as number);
          if (!info) continue;
          const kind: 'admin' | 'sub_admin' | 'teacher' =
            ur.role_id === roleIdsByName.admin
              ? 'admin'
              : ur.role_id === roleIdsByName.sub_admin
              ? 'sub_admin'
              : 'teacher';
          usersWithRoles.push({
            id: ur.user_id as number,
            name: info.name,
            kind,
            auth_user_id: info.auth_user_id,
          });
        }
      }
    }

    const neededAuthIds = Array.from(
      new Set([
        ...usersWithRoles.map((u) => u.auth_user_id),
      ]),
    );

    const authInfoMap: Record<string, { email: string; created_at: string }> = {};
    let page = 1;
    const perPage = 200;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        return { ok: false, error: error.message, details: error };
      }
      const users = data?.users ?? [];
      if (users.length === 0) {
        break;
      }
      for (const au of users) {
        const id = au.id as string;
        if (neededAuthIds.includes(id)) {
          authInfoMap[id] = {
            email: (au.email as string) ?? '',
            created_at: (au.created_at as string) ?? '',
          };
        }
      }
      if (users.length < perPage) {
        break;
      }
      page += 1;
    }

    const summaries: UserSummary[] = [
      ...usersWithRoles.map((u) => ({
        id: u.id,
        name: u.name,
        kind: u.kind,
        email: authInfoMap[u.auth_user_id]?.email ?? '',
        createdAt: authInfoMap[u.auth_user_id]?.created_at ?? '',
      })),
    ];

    return { ok: true, users: summaries };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    };
  }
}
