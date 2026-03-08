'use server';
import { NextResponse } from 'next/server';
import { bulkSetStatusForTeacher, bulkDeleteStudentsForTeacher } from '@/app/actions/students';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const teacher_id = Number(body?.teacher_id);
    const status = String(body?.status ?? '');
    const exclude_ids = Array.isArray(body?.exclude_ids) ? (body.exclude_ids as unknown[]).map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
    if (!Number.isFinite(teacher_id) || teacher_id <= 0) {
      return NextResponse.json({ ok: false, error: 'teacher_id غير صالح' }, { status: 400 });
    }
    if (status !== 'passed' && status !== 'failed') {
      return NextResponse.json({ ok: false, error: 'status غير صالح' }, { status: 400 });
    }
    if (status === 'passed') {
      const del = await bulkDeleteStudentsForTeacher({ teacher_id, exclude_ids });
      if (!del.ok) {
        return NextResponse.json({ ok: false, error: del.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, affected: del.affected });
    } else {
      const upd = await bulkSetStatusForTeacher({ teacher_id, status: 'failed', exclude_ids });
      if (!upd.ok) {
        return NextResponse.json({ ok: false, error: upd.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, affected: upd.affected });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'خطأ في الخادم' }, { status: 500 });
  }
}
