import { listStudents } from '@/app/actions/students';
import { createAdminClient } from '@/lib/supabase/admin';
import StudentTable, { type StudentWithTeacher } from '@/components/student/StudentTable';
import { Suspense } from 'react';
import { Container, Stack, Typography, Alert, Box, Grid } from '@mui/material';
import { Card, CardContent } from '@/components/ui';
import { PeopleRounded, SchoolRounded, PendingActionsRounded } from '@mui/icons-material';

async function StudentsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = {
    // ... (نفس منطق استخراج البيانات السابق بدون تغيير)
    status: typeof sp.status === 'string' ? sp.status : undefined,
    teacher_id: typeof sp.teacher_id === 'string' ? Number(sp.teacher_id) : undefined,
    search: typeof sp.search === 'string' ? sp.search : undefined,
    show_exams: typeof sp.show_exams === 'string' ? sp.show_exams === 'true' : undefined,
    sort_by: (sp.sort_by as any) || 'created_at',
    sort_dir: (sp.sort_dir as any) || 'desc',
    page: typeof sp.page === 'string' ? Math.max(1, Number(sp.page)) : 1,
    per_page: typeof sp.per_page === 'string' ? Math.max(1, Math.min(200, Number(sp.per_page))) : 20,
  };

  const res = await listStudents(q);
  if (!res.ok) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
        <Alert severity="error" sx={{ borderRadius: '16px', fontWeight: 600 }}>{res.error}</Alert>
      </Container>
    );
  }

  // --- منطق جلب أسماء المعلمين ---
  const students = res.students;
  const teacherIds = Array.from(new Set(students.map((s) => s.teacher_id).filter((id) => typeof id === 'number'))) as number[];
  let teacherNameById = new Map<number, string>();
  if (teacherIds.length > 0) {
    const supabase = createAdminClient();
    const { data: usersRows } = await supabase.from('users').select('id,name').in('id', teacherIds);
    teacherNameById = new Map<number, string>((usersRows ?? []).map((u) => [u.id as number, u.name as string]));
  }

  const withTeacher: StudentWithTeacher[] = students.map((s) => ({
    ...s,
    teacher_name: teacherNameById.get(s.teacher_id),
  }));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      {/* Header مع لمسة جمالية */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" sx={{ mb: 4 }} spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--brand-dark)', letterSpacing: '-0.5px' }}>
            إدارة <span style={{ color: 'var(--brand-teal)' }}>الطلاب</span>
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-600)', mt: 0.5, fontWeight: 500 }}>
            يمكنك متابعة تسجيلات الطلاب، الفلترة حسب المعلم، ومراجعة حالات الدفع والاختبارات.
          </Typography>
        </Box>
      </Stack>

      {/* بطاقات إحصائية سريعة (Quick Stats) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'إجمالي الطلاب', value: res.total, icon: <PeopleRounded />, color: 'var(--brand-teal)' },
          { label: 'نشط حالياً', value: students.length, icon: <SchoolRounded />, color: 'var(--brand-gold)' },
        ].map((stat, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
            <Card sx={{ border: '1px solid var(--neutral-200)', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: `${stat.color}15`, color: stat.color, display: 'flex' }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--neutral-500)', fontWeight: 700, display: 'block' }}>{stat.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{stat.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* حاوية الجدول الرئيسية */}
      <Card sx={{ 
        borderRadius: '24px', 
        border: '1px solid var(--neutral-200)', 
        boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        bgcolor: 'white'
      }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: { xs: 1, md: 2 } }}>
            <StudentTable
              students={withTeacher}
              page={res.page}
              perPage={res.perPage}
              total={res.total}
              sortBy={q.sort_by}
              sortDir={q.sort_dir}
              initialSearch={q.search}
            />
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense
      fallback={
        <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
           <Box sx={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid var(--brand-teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <Typography sx={{ color: 'var(--neutral-500)', fontWeight: 600 }}>جارٍ تحضير قوائم الطلاب...</Typography>
           </Box>
           <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </Container>
      }
    >
      <StudentsContent searchParams={searchParams} />
    </Suspense>
  );
}
