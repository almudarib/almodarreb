import { Suspense } from 'react';
import { Container, Stack, Typography, Alert, Box, Chip } from '@mui/material';
import { Card, CardContent, CardHeader, CardActions, Button } from '@/components/ui';
import { listStudentAvailableExams, getStudentProfile, type ExamListItem } from '@/app/actions/students';

async function ExamsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sidRaw = typeof sp.student_id === 'string' ? sp.student_id : undefined;
  const studentId = sidRaw ? Number(sidRaw) : NaN;
  if (!Number.isFinite(studentId) || studentId <= 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          يجب تمرير رقم الطالب عبر معامل student_id
        </Alert>
      </Container>
    );
  }

  const [profileRes, examsRes] = await Promise.all([
    getStudentProfile(studentId),
    listStudentAvailableExams(studentId),
  ]);
  if (!profileRes.ok) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          {profileRes.error}
        </Alert>
      </Container>
    );
  }
  if (!examsRes.ok) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          {examsRes.error}
        </Alert>
      </Container>
    );
  }

  const exams = examsRes.exams as ExamListItem[];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>
            الامتحانات المتاحة
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
            الطالب: {profileRes.profile.name}
          </Typography>
        </Box>
      </Stack>

      {exams.length === 0 ? (
        <Card>
          <CardContent>
            <Typography sx={{ color: 'var(--neutral-700)' }}>
              لا توجد امتحانات متاحة الآن
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          {exams.map((ex) => (
            <Card key={ex.id}>
              <CardHeader
                title={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>
                      {ex.title}
                    </Typography>
                    <Chip label={String(ex.language).toUpperCase()} size="small" />
                  </Stack>
                }
              />
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="body2" sx={{ color: 'var(--neutral-700)' }}>
                    مدة الامتحان: {ex.duration_minutes} دقيقة
                  </Typography>
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Button variant="contained" disabled>
                  ابدأ الامتحان
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}
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
      <ExamsContent searchParams={searchParams} />
    </Suspense>
  );
}

