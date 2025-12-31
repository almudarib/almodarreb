'use server';

import { createAdminClient } from '@/lib/supabase/admin';

type UserKind = 'admin' | 'teacher' | 'student';

type BaseInput = {
  email: string;
  password: string;
  name: string;
  kind: UserKind;
};

type StudentInput = BaseInput & {
  kind: 'student';
  language: string;
  teacherId: number;
  nationalId: string;
  showExams?: boolean;
  examDatetime?: string | null;
  startDate?: string | null;
  notes?: string | null;
};

type TeacherInput = BaseInput & {
  kind: 'teacher';
};

type AdminInput = BaseInput & {
  kind: 'admin';
};

export type CreateUserInput = StudentInput | TeacherInput | AdminInput;

type CreateUserResult =
  | {
      ok: true;
      kind: UserKind;
      authUserId: string;
      userId?: number;
      studentId?: number;
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

    if (input.kind === 'student') {
      const { data: studentInsert, error: studentError } = await supabase
        .from('students')
        .insert({
          auth_user_id: authUserId,
          name: input.name,
          national_id: input.nationalId,
          language: input.language,
          exam_datetime: input.examDatetime ?? null,
          start_date: input.startDate ?? null,
          notes: input.notes ?? null,
          show_exams: input.showExams ?? true,
          teacher_id: input.teacherId,
        })
        .select('id')
        .single();
      if (studentError) {
        return { ok: false, error: studentError.message, details: studentError };
      }
      return {
        ok: true,
        kind: input.kind,
        authUserId,
        studentId: studentInsert.id as number,
      };
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

export async function listAllUsersWithKind(): Promise<
  | { ok: true; users: ListedKindUser[] }
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

    const usersWithRoles: ListedKindUser[] = [];
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
          .select('id,name')
          .in('id', allUserIds);
        if (usersError) {
          return { ok: false, error: usersError.message, details: usersError };
        }

        const userById = new Map<number, string>(
          (usersRows ?? []).map((u) => [u.id as number, u.name as string]),
        );

        for (const ur of userRolesRows ?? []) {
          const name = userById.get(ur.user_id as number);
          if (!name) continue;
          const kind: UserKind =
            ur.role_id === roleIdsByName.admin
              ? 'admin'
              : ur.role_id === roleIdsByName.teacher
              ? 'teacher'
              : 'teacher';
          usersWithRoles.push({ id: ur.user_id as number, name, kind });
        }
      }
    }

    const { data: studentsRows, error: studentsError } = await supabase
      .from('students')
      .select('id,name');
    if (studentsError) {
      return { ok: false, error: studentsError.message, details: studentsError };
    }

    const students: ListedKindUser[] = (studentsRows ?? []).map((s) => ({
      id: s.id as number,
      name: s.name as string,
      kind: 'student',
    }));

    return { ok: true, users: [...usersWithRoles, ...students] };
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
    if (kind === 'student') {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from('students').select('id,name');
      if (error) {
        return { ok: false, error: error.message, details: error };
      }
      return {
        ok: true,
        users: (data ?? []).map((s) => ({
          id: s.id as number,
          name: s.name as string,
          kind: 'student',
        })),
      };
    }

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

export type UserDetails =
  | {
      kind: 'admin' | 'teacher';
      id: number;
      name: string;
      auth_user_id: string;
    }
  | {
      kind: 'student';
      id: number;
      name: string;
      auth_user_id: string;
      national_id: string;
      language: string;
      exam_datetime: string | null;
      start_date: string | null;
      notes: string | null;
      show_exams: boolean;
      teacher_id: number;
    };

export async function getUserDetails(
  kind: UserKind,
  id: number,
): Promise<{ ok: true; user: UserDetails } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    if (kind === 'student') {
      const { data, error } = await supabase
        .from('students')
        .select(
          'id,name,auth_user_id,national_id,language,exam_datetime,start_date,notes,show_exams,teacher_id',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) {
        return { ok: false, error: error.message, details: error };
      }
      if (!data) {
        return { ok: false, error: 'Student not found' };
      }
      return {
        ok: true,
        user: {
          kind: 'student',
          id: data.id as number,
          name: data.name as string,
          auth_user_id: data.auth_user_id as string,
          national_id: data.national_id as string,
          language: data.language as string,
          exam_datetime: (data.exam_datetime as string | null) ?? null,
          start_date: (data.start_date as string | null) ?? null,
          notes: (data.notes as string | null) ?? null,
          show_exams: (data.show_exams as boolean) ?? true,
          teacher_id: data.teacher_id as number,
        },
      };
    }
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

type UpdateStudentInput = {
  kind: 'student';
  id: number;
  name?: string;
  nationalId?: string;
  language?: string;
  examDatetime?: string | null;
  startDate?: string | null;
  notes?: string | null;
  showExams?: boolean;
  teacherId?: number;
};

type UpdateUserInput = {
  kind: 'admin' | 'teacher';
  id: number;
  name?: string;
};

export async function updateUser(
  input: UpdateStudentInput | UpdateUserInput,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    if (input.kind === 'student') {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) payload.name = input.name;
      if (input.nationalId !== undefined) payload.national_id = input.nationalId;
      if (input.language !== undefined) payload.language = input.language;
      if (input.examDatetime !== undefined) payload.exam_datetime = input.examDatetime;
      if (input.startDate !== undefined) payload.start_date = input.startDate;
      if (input.notes !== undefined) payload.notes = input.notes;
      if (input.showExams !== undefined) payload.show_exams = input.showExams;
      if (input.teacherId !== undefined) payload.teacher_id = input.teacherId;
      const { error } = await supabase.from('students').update(payload).eq('id', input.id);
      if (error) {
        return { ok: false, error: error.message, details: error };
      }
      return { ok: true };
    }
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
    if (kind === 'student') {
      const { data: s, error: selError } = await supabase
        .from('students')
        .select('auth_user_id')
        .eq('id', id)
        .maybeSingle();
      if (selError) {
        return { ok: false, error: selError.message, details: selError };
      }
      if (!s?.auth_user_id) {
        return { ok: false, error: 'Student auth user not found' };
      }
      const { error: delAuthErr } = await supabase.auth.admin.deleteUser(s.auth_user_id as string);
      if (delAuthErr) {
        return { ok: false, error: delAuthErr.message, details: delAuthErr };
      }
      return { ok: true };
    }
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
