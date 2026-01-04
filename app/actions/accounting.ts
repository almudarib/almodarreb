'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type AccountingStatus = 'pending' | 'paid' | string;

export type AccountingEntry = {
  id: number;
  teacher_id: number;
  student_id: number;
  amount: number;
  status: AccountingStatus;
  created_at: string;
};

export type TeacherAccountingStats = {
  teacher_id: number;
  teacher_name: string;
  students_count: number;
  total_due: number;
  pending_entries: number;
};

export type StudentAmount = {
  student_id: number;
  student_name: string;
  pending_amount: number;
  pending_entries: number;
};

export type TeacherAccountingDetails = {
  teacher_id: number;
  teacher_name: string;
  students_count: number;
  total_due: number;
  per_student_fee: number | null;
  students: StudentAmount[];
};

export async function listTeacherAccountingStats(options?: {
  from?: string;
  to?: string;
}): Promise<
  | { ok: true; stats: TeacherAccountingStats[] }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const supabase = createAdminClient();

    const { data: roleRow, error: roleErr } = await supabase
      .from('roles')
      .select('id,name')
      .eq('name', 'teacher')
      .maybeSingle();
    if (roleErr) {
      return { ok: false, error: roleErr.message, details: roleErr };
    }
    const teacherRoleId = (roleRow?.id as number | undefined) ?? undefined;

    let teacherIds: number[] = [];
    if (teacherRoleId !== undefined) {
      const { data: userRolesRows, error: userRolesErr } = await supabase
        .from('user_roles')
        .select('user_id,role_id')
        .eq('role_id', teacherRoleId);
      if (userRolesErr) {
        return { ok: false, error: userRolesErr.message, details: userRolesErr };
      }
      teacherIds = Array.from(
        new Set(
          (userRolesRows ?? [])
            .map((r) => (r as unknown as { user_id: unknown }).user_id)
            .filter((id) => typeof id === 'number'),
        ),
      ) as number[];
    }

    try {
      const { data: studentsTid } = await supabase.from('students').select('teacher_id');
      const { data: accTid } = await supabase.from('accounting').select('teacher_id');
      const { data: settingsTid } = await supabase.from('teacher_accounting_settings').select('teacher_id');
      const extraIds = [
        ...((studentsTid ?? []).map((r) => r.teacher_id as number | undefined).filter((v): v is number => typeof v === 'number')),
        ...((accTid ?? []).map((r) => r.teacher_id as number | undefined).filter((v): v is number => typeof v === 'number')),
        ...((settingsTid ?? []).map((r) => r.teacher_id as number | undefined).filter((v): v is number => typeof v === 'number')),
      ];
      teacherIds = Array.from(new Set([...(teacherIds ?? []), ...extraIds]));
    } catch {}
    if (teacherIds.length === 0) {
      return { ok: true, stats: [] };
    }

    const { data: usersRows, error: usersErr } = await supabase
      .from('users')
      .select('id,name')
      .in('id', teacherIds);
    if (usersErr) {
      return { ok: false, error: usersErr.message, details: usersErr };
    }
    const teacherNameById = new Map<number, string>(
      (usersRows ?? []).map((u) => [u.id as number, (u.name as string) ?? '']),
    );

    const stats: TeacherAccountingStats[] = [];

    for (const tid of teacherIds) {
      const { data: studentsRows, error: studentsErr } = await supabase
        .from('students')
        .select('id')
        .eq('teacher_id', tid);
      if (studentsErr) {
        return { ok: false, error: studentsErr.message, details: studentsErr };
      }
      const students_count = (studentsRows ?? []).length;

      let accBuilder = supabase
        .from('accounting')
        .select('amount,status,created_at')
        .eq('teacher_id', tid)
        .eq('status', 'pending');
      if (options?.from) accBuilder = accBuilder.gte('created_at', options.from);
      if (options?.to) {
        const d = new Date(String(options.to).replace('+00:00', 'Z'));
        d.setUTCHours(23, 59, 59, 999);
        const toIso = d.toISOString().replace('Z', '+00:00');
        accBuilder = accBuilder.lte('created_at', toIso);
      }
      const { data: accRows, error: accErr } = await accBuilder;
      if (accErr) {
        return { ok: false, error: accErr.message, details: accErr };
      }
      const total_due = ((accRows ?? []) as Array<{ amount: number }>).reduce(
        (sum, r) => sum + (Number(r.amount) || 0),
        0,
      );
      const pending_entries = (accRows ?? []).length;

      stats.push({
        teacher_id: tid,
        teacher_name: teacherNameById.get(tid) ?? '',
        students_count,
        total_due,
        pending_entries,
      });
    }

    return { ok: true, stats };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function getTeacherAccountingStats(
  teacherId: number,
): Promise<{ ok: true; stats: TeacherAccountingStats } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();

    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id,name')
      .eq('id', teacherId)
      .maybeSingle();
    if (userErr) {
      return { ok: false, error: userErr.message, details: userErr };
    }
    if (!userRow) {
      return { ok: false, error: 'المعلم غير موجود' };
    }

    const { data: studentsRows, error: studentsErr } = await supabase
      .from('students')
      .select('id')
      .eq('teacher_id', teacherId);
    if (studentsErr) {
      return { ok: false, error: studentsErr.message, details: studentsErr };
    }
    const students_count = (studentsRows ?? []).length;

    const { data: accRows, error: accErr } = await supabase
      .from('accounting')
      .select('amount,status')
      .eq('teacher_id', teacherId)
      .eq('status', 'pending');
    if (accErr) {
      return { ok: false, error: accErr.message, details: accErr };
    }

    const total_due = ((accRows ?? []) as Array<{ amount: number }>).reduce(
      (sum, r) => sum + (Number(r.amount) || 0),
      0,
    );
    const pending_entries = (accRows ?? []).length;

    return {
      ok: true,
      stats: {
        teacher_id: teacherId,
        teacher_name: (userRow.name as string) ?? '',
        students_count,
        total_due,
        pending_entries,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function listTeacherAccountingEntries(
  teacherId: number,
  status?: AccountingStatus,
): Promise<{ ok: true; entries: AccountingEntry[] } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    let builder = supabase
      .from('accounting')
      .select('id,teacher_id,student_id,amount,status,created_at')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: true });
    if (status) builder = builder.eq('status', status);
    const { data, error } = await builder;
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const entries: AccountingEntry[] = (data ?? []).map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: r.id as number,
        teacher_id: r.teacher_id as number,
        student_id: r.student_id as number,
        amount: Number(r.amount) || 0,
        status: (r.status as AccountingStatus | undefined) ?? 'pending',
        created_at: r.created_at as string,
      };
    });
    return { ok: true, entries };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function addAccountingCharge(input: {
  student_id: number;
  amount: number;
  teacher_id?: number;
}): Promise<{ ok: true; entry: AccountingEntry } | { ok: false; error: string; details?: unknown }> {
  try {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'المبلغ غير صالح' };
    }
    const supabase = createAdminClient();
    let teacherId = input.teacher_id;
    if (!teacherId) {
      const { data: stRow, error: stErr } = await supabase
        .from('students')
        .select('id,teacher_id')
        .eq('id', input.student_id)
        .maybeSingle();
      if (stErr) {
        return { ok: false, error: stErr.message, details: stErr };
      }
      if (!stRow?.teacher_id) {
        return { ok: false, error: 'لا يمكن تحديد المعلم المرتبط بالطالب' };
      }
      teacherId = stRow.teacher_id as number;
    }

    const { data: inserted, error: insErr } = await supabase
      .from('accounting')
      .insert({
        teacher_id: teacherId,
        student_id: input.student_id,
        amount,
        status: 'pending',
      })
      .select('id,teacher_id,student_id,amount,status,created_at')
      .single();
    if (insErr) {
      return { ok: false, error: insErr.message, details: insErr };
    }
    const r = inserted as unknown as Record<string, unknown>;
    const entry: AccountingEntry = {
      id: r.id as number,
      teacher_id: r.teacher_id as number,
      student_id: r.student_id as number,
      amount: Number(r.amount) || amount,
      status: (r.status as AccountingStatus | undefined) ?? 'pending',
      created_at: r.created_at as string,
    };
    return { ok: true, entry };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function applyTeacherPayment(input: {
  teacher_id: number;
  amount: number;
  action_by_user_id?: number;
}): Promise<
  | {
      ok: true;
      applied_amount: number;
      remaining_unapplied: number;
      updated_entry_ids: number[];
      created_payment_entry_ids: number[];
    }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'المبلغ غير صالح' };
    }
    const supabase = createAdminClient();

    const { data: pendingRows, error: pendErr } = await supabase
      .from('accounting')
      .select('id,student_id,amount,created_at')
      .eq('teacher_id', input.teacher_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (pendErr) {
      return { ok: false, error: pendErr.message, details: pendErr };
    }
    let remaining = amount;
    const updated_entry_ids: number[] = [];
    const created_payment_entry_ids: number[] = [];
    const settlements: Array<{ studentId: number; amount: number }> = [];

    for (const row of ((pendingRows ?? []) as Array<{
      id: number;
      student_id: number;
      amount: number;
      created_at: string;
    }>)) {
      if (remaining <= 0) break;
      const id = row.id as number;
      const studentId = row.student_id as number;
      const rowAmount = Number(row.amount) || 0;
      if (rowAmount <= 0) continue;

      if (remaining >= rowAmount) {
        const { error: delErr } = await supabase.from('accounting').delete().eq('id', id);
        if (delErr) {
          return { ok: false, error: delErr.message, details: delErr };
        }
        try {
          if (input.action_by_user_id) {
            await supabase.from('student_actions').insert({
              student_id: studentId,
              action: 'acc_paid_full',
              action_by: input.action_by_user_id,
            });
          }
        } catch {}
        remaining -= rowAmount;
        settlements.push({ studentId, amount: rowAmount });
      } else {
        const newAmount = Math.max(rowAmount - remaining, 0);
        if (newAmount <= 0) {
          const { error: delErr } = await supabase.from('accounting').delete().eq('id', id);
          if (delErr) {
            return { ok: false, error: delErr.message, details: delErr };
          }
        } else {
          const { error: reduceErr } = await supabase
            .from('accounting')
            .update({ amount: newAmount, status: 'pending' })
            .eq('id', id);
          if (reduceErr) {
            return { ok: false, error: reduceErr.message, details: reduceErr };
          }
          updated_entry_ids.push(id);
        }
        try {
          if (input.action_by_user_id) {
            await supabase.from('student_actions').insert({
              student_id: studentId,
              action: 'acc_paid_partial',
              action_by: input.action_by_user_id,
            });
          }
        } catch {}
        settlements.push({ studentId, amount: remaining });
        remaining = 0;
        break;
      }
    }

    const applied_amount = amount - remaining;

    const cleanup = await cleanupZeroPendingForTeacher(input.teacher_id);
    if (!cleanup.ok) {
      return { ok: false, error: cleanup.error, details: cleanup.details };
    }

    const { data: checkRows, error: checkErr } = await supabase
      .from('accounting')
      .select('amount')
      .eq('teacher_id', input.teacher_id)
      .eq('status', 'pending');
    if (checkErr) {
      return { ok: false, error: checkErr.message, details: checkErr };
    }
    const remaining_due = ((checkRows ?? []) as Array<{ amount: number }>).reduce(
      (sum, r) => sum + (Number(r.amount) || 0),
      0,
    );
    if (remaining_due === 0 && settlements.length > 0) {
      const payload = settlements.map((s) => ({
        teacher_id: input.teacher_id,
        student_id: s.studentId,
        amount: s.amount,
        status: 'paid',
      }));
      const { data: inserted, error: insErr } = await supabase
        .from('accounting')
        .insert(payload)
        .select('id');
      if (insErr) {
        return { ok: false, error: insErr.message, details: insErr };
      }
      created_payment_entry_ids.push(...((inserted ?? []) as Array<{ id: number }>).map((r) => r.id));
    }

    return {
      ok: true,
      applied_amount,
      remaining_unapplied: remaining,
      updated_entry_ids,
      created_payment_entry_ids,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function getTeacherAccountingDetails(
  teacherId: number,
): Promise<{ ok: true; details: TeacherAccountingDetails } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id,name')
      .eq('id', teacherId)
      .maybeSingle();
    if (userErr) {
      return { ok: false, error: userErr.message, details: userErr };
    }
    if (!userRow) {
      return { ok: false, error: 'المعلم غير موجود' };
    }
    const { data: feeRow, error: feeErr } = await supabase
      .from('teacher_accounting_settings')
      .select('per_student_fee')
      .eq('teacher_id', teacherId)
      .maybeSingle();
    if (feeErr) {
      return { ok: false, error: feeErr.message, details: feeErr };
    }
    const { data: studentsRows, error: studentsErr } = await supabase
      .from('students')
      .select('id,name')
      .eq('teacher_id', teacherId);
    if (studentsErr) {
      return { ok: false, error: studentsErr.message, details: studentsErr };
    }
    const { data: accRows, error: accErr } = await supabase
      .from('accounting')
      .select('student_id,amount,status')
      .eq('teacher_id', teacherId)
      .eq('status', 'pending');
    if (accErr) {
      return { ok: false, error: accErr.message, details: accErr };
    }
    const pendingByStudent = new Map<number, { sum: number; count: number }>();
    for (const r of accRows ?? []) {
      const sid = r.student_id as number;
      const amt = Number(r.amount) || 0;
      const prev = pendingByStudent.get(sid) ?? { sum: 0, count: 0 };
      pendingByStudent.set(sid, { sum: prev.sum + amt, count: prev.count + 1 });
    }
    const students: StudentAmount[] = (studentsRows ?? []).map((s) => {
      const info = pendingByStudent.get(s.id as number) ?? { sum: 0, count: 0 };
      return {
        student_id: s.id as number,
        student_name: (s.name as string) ?? '',
        pending_amount: info.sum,
        pending_entries: info.count,
      };
    });
    const filteredStudents = students.filter((s) => s.pending_amount > 0 && s.pending_entries > 0);
    const total_due = filteredStudents.reduce((sum, s) => sum + s.pending_amount, 0);
    const details: TeacherAccountingDetails = {
      teacher_id: teacherId,
      teacher_name: (userRow.name as string) ?? '',
      students_count: filteredStudents.length,
      total_due,
      per_student_fee: (feeRow?.per_student_fee as number | null) ?? null,
      students: filteredStudents,
    };
    return { ok: true, details };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function deleteTeacherAccountingPending(
  teacherId: number,
  action_by_user_id?: number,
): Promise<{ ok: true; deleted: number } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data: rows, error } = await supabase
      .from('accounting')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('status', 'pending')
      .select('id,student_id');
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    try {
      if (action_by_user_id) {
        for (const r of rows ?? []) {
          await supabase.from('student_actions').insert({
            student_id: r.student_id as number,
            action: 'acc_delete_pending',
            action_by: action_by_user_id,
          });
        }
      }
    } catch {}
    return { ok: true, deleted: (rows ?? []).length };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function initializeDefaultFeeForTeacher(
  teacherId: number,
  perStudentFee: number,
  options?: { overwriteExisting?: boolean; action_by_user_id?: number },
): Promise<{ ok: true; inserted: number; deleted: number } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const fee = Number(perStudentFee);
    if (!Number.isFinite(fee) || fee < 0) {
      return { ok: false, error: 'القيمة الافتراضية غير صالحة' };
    }
    const { error: upErr } = await supabase
      .from('teacher_accounting_settings')
      .upsert({ teacher_id: teacherId, per_student_fee: fee })
      .eq('teacher_id', teacherId);
    if (upErr) {
      return { ok: false, error: upErr.message, details: upErr };
    }
    let deleted = 0;
    if (options?.overwriteExisting) {
      const del = await deleteTeacherAccountingPending(teacherId, options.action_by_user_id);
      if (!del.ok) {
        return { ok: false, error: del.error, details: del.details };
      }
      deleted = del.deleted;
    }
    const { data: studentsRows, error: studentsErr } = await supabase
      .from('students')
      .select('id')
      .eq('teacher_id', teacherId);
    if (studentsErr) {
      return { ok: false, error: studentsErr.message, details: studentsErr };
    }
    const payload = (studentsRows ?? []).map((s) => ({
      teacher_id: teacherId,
      student_id: s.id as number,
      amount: fee,
      status: 'pending',
    }));
    let inserted = 0;
    if (payload.length > 0) {
      const { data: insRows, error: insErr } = await supabase
        .from('accounting')
        .insert(payload)
        .select('id,student_id');
      if (insErr) {
        return { ok: false, error: insErr.message, details: insErr };
      }
      inserted = (insRows ?? []).length;
      try {
        if (options?.action_by_user_id) {
          for (const r of insRows ?? []) {
            await supabase.from('student_actions').insert({
              student_id: r.student_id as number,
              action: 'acc_init_default',
              action_by: options.action_by_user_id,
            });
          }
        }
      } catch {}
    }
    return { ok: true, inserted, deleted };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function cleanupZeroPendingForTeacher(
  teacherId: number,
): Promise<{ ok: true; deleted: number } | { ok: false; error: string; details?: unknown }> {
  try {
    const supabase = createAdminClient();
    const { data: rows, error } = await supabase
      .from('accounting')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('status', 'pending')
      .lte('amount', 0)
      .select('id');
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    return { ok: true, deleted: (rows ?? []).length };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

export async function initializeDefaultFeeForAllTeachers(
  perStudentFee: number,
  options?: { overwriteExisting?: boolean; action_by_user_id?: number },
): Promise<
  | { ok: true; teacher_ids: number[]; total_inserted: number; total_deleted: number }
  | { ok: false; error: string; details?: unknown }
> {
  try {
    const supabase = createAdminClient();
    const fee = Number(perStudentFee);
    if (!Number.isFinite(fee) || fee < 0) {
      return { ok: false, error: 'القيمة الافتراضية غير صالحة' };
    }
    const { data: roleRow, error: roleErr } = await supabase
      .from('roles')
      .select('id,name')
      .eq('name', 'teacher')
      .maybeSingle();
    if (roleErr) {
      return { ok: false, error: roleErr.message, details: roleErr };
    }
    const teacherRoleId = (roleRow?.id as number | undefined) ?? undefined;
    let teacherIds: number[] = [];
    if (teacherRoleId !== undefined) {
      const { data: userRolesRows, error: userRolesErr } = await supabase
        .from('user_roles')
        .select('user_id,role_id')
        .eq('role_id', teacherRoleId);
      if (userRolesErr) {
        return { ok: false, error: userRolesErr.message, details: userRolesErr };
      }
      teacherIds = Array.from(
        new Set(
          (userRolesRows ?? [])
            .map((r) => (r as unknown as { user_id: unknown }).user_id)
            .filter((id) => typeof id === 'number'),
        ),
      ) as number[];
    }
    if (teacherIds.length === 0) {
      return { ok: true, teacher_ids: [], total_inserted: 0, total_deleted: 0 };
    }
    const settingsPayload = teacherIds.map((tid) => ({
      teacher_id: tid,
      per_student_fee: fee,
    }));
    const { error: upErr } = await supabase.from('teacher_accounting_settings').upsert(settingsPayload);
    if (upErr) {
      return { ok: false, error: upErr.message, details: upErr };
    }
    let totalInserted = 0;
    let totalDeleted = 0;
    for (const tid of teacherIds) {
      const result = await initializeDefaultFeeForTeacher(tid, fee, {
        overwriteExisting: options?.overwriteExisting ?? true,
        action_by_user_id: options?.action_by_user_id,
      });
      if (!result.ok) {
        return { ok: false, error: result.error, details: result.details };
      }
      totalInserted += result.inserted;
      totalDeleted += result.deleted;
    }
    return {
      ok: true,
      teacher_ids: teacherIds,
      total_inserted: totalInserted,
      total_deleted: totalDeleted,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}
