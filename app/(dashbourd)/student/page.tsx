import { Suspense } from 'react';
import Link from 'next/link';
import { Container, Stack, Typography, Alert, Box, Chip, LinearProgress } from '@mui/material';
import { Card, CardHeader, CardContent, CardActions, Button } from '@/components/ui';
import { getStudentPortalData } from '@/app/actions/students';
import { getStudentStudyStats } from '@/app/actions/stu-activity';

async function StudentDashboardContent({
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

  const [portalRes, studyRes] = await Promise.all([
    getStudentPortalData(studentId),
    getStudentStudyStats(studentId),
  ]);
  if (!portalRes.ok) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          {portalRes.error}
        </Alert>
      </Container>
    );
  }

  const profile = portalRes.profile;
  const exams = portalRes.exams;
  const sessions = portalRes.sessions;
  const progress = portalRes.progress;
  const results = portalRes.results;

  const watchedSessions = studyRes.ok ? studyRes.stats.sessionsCount : 0;
  const totalSessions = sessions.length;
  const progressPercent =
    totalSessions > 0 ? Math.min(100, Math.round((watchedSessions / totalSessions) * 100)) : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>
            لوحة الطالب
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
            الطالب: {profile.name}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Link href={`/student/videos?student_id=${studentId}`} prefetch>
            <Button variant="outlined">الجلسات التعليمية</Button>
          </Link>
          <Link href={`/student/exams?student_id=${studentId}`} prefetch>
            <Button variant="contained">الامتحانات</Button>
          </Link>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        <Card id="profile">
          <CardHeader
            title={
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>
                  ملف الطالب
                </Typography>
                <Chip
                  label={profile.status === 'active' ? 'نشط' : 'غير نشط'}
                  color={profile.status === 'active' ? 'success' : 'default'}
                  size="small"
                />
              </Stack>
            }
          />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
              <Box sx={{ flex: 1 }}>
                <Stack spacing={1}>
                  <Typography sx={{ color: 'var(--neutral-700)' }}>الاسم: {profile.name}</Typography>
                  <Typography sx={{ color: 'var(--neutral-700)' }}>
                    رقم الهوية: {profile.national_id}
                  </Typography>
                  <Typography sx={{ color: 'var(--neutral-700)' }}>
                    رقم المعلم: {profile.teacher_id}
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Stack spacing={1}>
                  <Typography sx={{ color: 'var(--neutral-700)' }}>
                    آخر دخول: {profile.last_login_at ?? '—'}
                  </Typography>
                  <Typography sx={{ color: 'var(--neutral-700)' }}>
                    تاريخ الإنشاء: {profile.created_at}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card id="progress">
          <CardHeader
            title={
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>
                شريط التقدم في الكورس
              </Typography>
            }
          />
          <CardContent>
            <Stack spacing={2}>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <Typography sx={{ color: 'var(--neutral-700)' }}>
                  التقدم: {progressPercent}%
                </Typography>
                <Typography sx={{ color: 'var(--neutral-700)' }}>
                  الجلسات المشاهدة: {watchedSessions} من {totalSessions}
                </Typography>
                <Typography sx={{ color: 'var(--neutral-700)' }}>
                  إجمالي الدراسة: {progress.totalStudyMinutes} دقيقة
                </Typography>
                <Typography sx={{ color: 'var(--neutral-700)' }}>
                  آخر نتيجة: {progress.lastScore ?? '—'}
                </Typography>
                <Typography sx={{ color: 'var(--neutral-700)' }}>
                  المتوقع: {progress.expectedScore ?? '—'}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card id="exams">
          <CardHeader
            title={
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>
                الامتحانات المتاحة له
              </Typography>
            }
          />
          <CardContent>
            {exams.length === 0 ? (
              <Typography sx={{ color: 'var(--neutral-700)' }}>
                لا توجد امتحانات متاحة الآن
              </Typography>
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
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>
                            {ex.title}
                          </Typography>
                          <Chip label={String(ex.language).toUpperCase()} size="small" />
                        </Stack>
                      }
                    />
                    <CardContent>
                      <Typography variant="body2" sx={{ color: 'var(--neutral-700)' }}>
                        مدة الامتحان: {ex.duration_minutes} دقيقة
                      </Typography>
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
          </CardContent>
          <CardActions sx={{ justifyContent: 'flex-end' }}>
            <Link href={`/student/exams?student_id=${studentId}`} prefetch>
              <Button variant="outlined">الانتقال إلى صفحة الامتحانات</Button>
            </Link>
          </CardActions>
        </Card>

        <Card id="results">
          <CardHeader
            title={
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>
                النتائج
              </Typography>
            }
          />
          <CardContent>
            {results.length === 0 ? (
              <Typography sx={{ color: 'var(--neutral-700)' }}>لا توجد نتائج بعد</Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                  gap: 2,
                }}
              >
                {results.map((r, idx) => (
                  <Card key={`${r.exam_id}-${idx}`}>
                    <CardHeader
                      title={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>
                            {r.exam_title ?? `امتحان ${r.exam_id}`}
                          </Typography>
                          <Chip label={`${r.score}%`} color="primary" size="small" />
                        </Stack>
                      }
                    />
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="body2" sx={{ color: 'var(--neutral-700)' }}>
                          التاريخ: {r.taken_at}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--neutral-700)' }}>
                          المدة: {r.duration_minutes ?? '—'} دقيقة
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>
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
      <StudentDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
