'use server';

export type UserKind = 'admin' | 'teacher';

export type BaseInput = {
  email: string;
  password: string;
  name: string;
  kind: UserKind;
};

export type TeacherInput = BaseInput & {
  kind: 'teacher';
  per_student_fee?: number;
};

export type AdminInput = BaseInput & {
  kind: 'admin';
};

export type CreateUserInput = TeacherInput | AdminInput;

export type CreateUserResult =
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

export type ListedUser = {
  id: number;
  name: string;
  auth_user_id: string;
};

export type ListedKindUser = {
  id: number;
  name: string;
  kind: UserKind;
};

export type ListUsersGroupedResult =
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

export type UserSummary = {
  id: number;
  name: string;
  email: string;
  kind: UserKind;
  createdAt: string;
};

export type UserDetails = {
  kind: 'admin' | 'teacher';
  id: number;
  name: string;
  auth_user_id: string;
};

export type UpdateUserInput = {
  kind: 'admin' | 'teacher';
  id: number;
  name?: string;
  email?: string;
  password?: string;
};
