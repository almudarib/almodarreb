import { listStudents } from '@/app/actions/students';
import { createAdminClient } from '@/lib/supabase/admin';
import StudentTable, { type StudentWithTeacher } from '@/components/student/StudentTable';
import { Suspense } from 'react';
import { Container, Stack, Typography, Alert, Box } from '@mui/material';
import { Card, CardContent } from '@/components/ui';

async function StudentsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = {
    status: typeof sp.status === 'string' ? sp.status : undefined,
    teacher_id:
      typeof sp.teacher_id === 'string'
        ? Number(sp.teacher_id)
        : undefined,
    search: typeof sp.search === 'string' ? sp.search : undefined,
    show_exams:
      typeof sp.show_exams === 'string'
        ? sp.show_exams === 'true'
        : undefined,
    exam_datetime_from:
      typeof sp.exam_datetime_from === 'string'
        ? sp.exam_datetime_from
        : undefined,
    exam_datetime_to:
      typeof sp.exam_datetime_to === 'string'
        ? sp.exam_datetime_to
        : undefined,
    registration_date_from:
      typeof sp.registration_date_from === 'string'
        ? sp.registration_date_from
        : undefined,
    registration_date_to:
      typeof sp.registration_date_to === 'string'
        ? sp.registration_date_to
        : undefined,
    created_at_from:
      typeof sp.created_at_from === 'string'
        ? sp.created_at_from
        : undefined,
    created_at_to:
      typeof sp.created_at_to === 'string'
        ? sp.created_at_to
        : undefined,
    sort_by:
      typeof sp.sort_by === 'string'
        ? (sp.sort_by as 'created_at' | 'name' | 'exam_datetime' | 'registration_date')
        : 'created_at',
    sort_dir:
      typeof sp.sort_dir === 'string'
        ? (sp.sort_dir as 'asc' | 'desc')
        : 'desc',
    page:
      typeof sp.page === 'string' ? Math.max(1, Number(sp.page)) : 1,
    per_page:
      typeof sp.per_page === 'string'
        ? Math.max(1, Math.min(200, Number(sp.per_page)))
        : 20,
  };

  const res = await listStudents(q);
  if (!res.ok) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          {res.error}
        </Alert>
      </Container>
    );
  }

  const students = res.students;
  const teacherIds = Array.from(
    new Set(students.map((s) => s.teacher_id).filter((id) => typeof id === 'number')),
  ) as number[];

  let teacherNameById = new Map<number, string>();
  if (teacherIds.length > 0) {
    const supabase = createAdminClient();
    const { data: usersRows } = await supabase
      .from('users')
      .select('id,name')
      .in('id', teacherIds);
    teacherNameById = new Map<number, string>(
      (usersRows ?? []).map((u) => [u.id as number, (u.name as string) ?? '']),
    );
  }

  const withTeacher: StudentWithTeacher[] = students.map((s) => ({
    ...s,
    teacher_name: teacherNameById.get(s.teacher_id),
  }));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>إدارة الطلاب</Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
            عرض، بحث، وتصفية سجلات الطلاب
          </Typography>
        </Box>
      </Stack>
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <StudentTable
              students={withTeacher}
              page={res.page}
              perPage={res.perPage}
              total={res.total}
              sortBy={q.sort_by ?? 'created_at'}
              sortDir={q.sort_dir ?? 'desc'}
              initialSearch={q.search}
            />
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
          <Card>
            <CardContent>
              <Typography>جارٍ التحميل...</Typography>
            </CardContent>
          </Card>
        </Container>
      }
    >
      <StudentsContent searchParams={searchParams} />
    </Suspense>
  );
}

