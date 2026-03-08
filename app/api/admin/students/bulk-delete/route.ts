'use server';
import { NextResponse } from 'next/server';
import { bulkDeleteStudentsForTeacher } from '@/app/actions/students';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const teacher_id = Number(body?.teacher_id);
    const exclude_ids = Array.isArray(body?.exclude_ids) ? (body.exclude_ids as unknown[]).map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
    if (!Number.isFinite(teacher_id) || teacher_id <= 0) {
      return NextResponse.json({ ok: false, error: 'teacher_id غير صالح' }, { status: 400 });
    }
    const res = await bulkDeleteStudentsForTeacher({ teacher_id, exclude_ids });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, affected: res.affected });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'خطأ في الخادم' }, { status: 500 });
  }
}

