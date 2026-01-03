'use server';

import { createAdminClient } from '@/lib/supabase/admin';

type UserKind = 'admin' | 'teacher';

type BaseInput = {
  email: string;
  password: string;
  name: string;
  kind: UserKind;
};

type TeacherInput = BaseInput & {
  kind: 'teacher';
  per_student_fee?: number;
};

type AdminInput = BaseInput & {
  kind: 'admin';
};

export type CreateUserInput = TeacherInput | AdminInput;

type CreateUserResult =
  | {
      ok: true;
      kind: UserKind;
      authUserId: string;
      userId?: number;
      roleAssigned?: string;
    }
  | {
      ok: false;
      error: string;
      details?: unknown;
    };

async function ensureRoleId(roleName: 'admin' | 'teacher') {
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

type ListedUser = {
  id: number;
  name: string;
  auth_user_id: string;
};

type ListedKindUser = {
  id: number;
  name: string;
  kind: UserKind;
};

type ListUsersGroupedResult =
  | {
      ok: true;
      admin: ListedUser[];
      teacher: ListedUser[];
    }
  | {
      ok: false;
      error: string;
      details?: unknown;
    };

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

// Removed student-related listing helper

export type UserSummary = {
  id: number;
  name: string;
  email: string;
  kind: UserKind;
  createdAt: string;
};

export async function listAllUsersSummary(): Promise<
  | { ok: true; users: UserSummary[] }
  | { ok: false; error: string; details?: unknown }
> {
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

    const usersWithRoles: Array<{
      id: number;
      name: string;
      kind: 'admin' | 'teacher';
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
          const kind: 'admin' | 'teacher' =
            ur.role_id === roleIdsByName.admin ? 'admin' : 'teacher';
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
    // Fetch pages until we have all or there are no more users
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
        kind: u.kind as UserKind,
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

export type UserDetails = {
  kind: 'admin' | 'teacher';
  id: number;
  name: string;
  auth_user_id: string;
};

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

type UpdateUserInput = {
  kind: 'admin' | 'teacher';
  id: number;
  name?: string;
};

export async function updateUser(
  input: UpdateUserInput,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = input.name;
    const { error } = await supabase.from('users').update(payload).eq('id', input.id);
    if (error) {
      return { ok: false, error: error.message, details: error };
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
