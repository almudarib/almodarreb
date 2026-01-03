'use client';

import * as React from 'react';
import { Box, Container, Stack, Typography, Snackbar, Alert, LinearProgress } from '@mui/material';
import { Card, CardHeader, CardContent, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { listUsersByKind } from '@/app/actions/users';
import { listStudents } from '@/app/actions/students';
import { listExams } from '@/app/actions/exam';
import { listSessions } from '@/app/actions/video';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<{
    teachers: number;
    admins: number;
    students: number;
    exams: number;
    videos: number;
  }>({ teachers: 0, admins: 0, students: 0, exams: 0, videos: 0 });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teachersRes, adminsRes, studentsRes, examsRes, videosRes] = await Promise.all([
        listUsersByKind('teacher'),
        listUsersByKind('admin'),
        listStudents({ page: 1, per_page: 1 }),
        listExams({ page: 1, per_page: 1 }),
        listSessions({ page: 1, per_page: 1, kind: 'video' }),
      ]);
      if (!teachersRes.ok) throw new Error(teachersRes.error);
      if (!adminsRes.ok) throw new Error(adminsRes.error);
      if (!studentsRes.ok) throw new Error(studentsRes.error);
      if (!examsRes.ok) throw new Error(examsRes.error);
      if (!videosRes.ok) throw new Error(videosRes.error);
      setStats({
        teachers: (teachersRes.users ?? []).length,
        admins: (adminsRes.users ?? []).length,
        students: studentsRes.total ?? 0,
        exams: examsRes.total ?? 0,
        videos: videosRes.total ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir="rtl">
      <Stack spacing={2}>
        <Typography variant="h5">لوحة التحكم - إحصائيات عامة</Typography>
        {loading ? <LinearProgress /> : null}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          <Card elevation={1}>
            <CardHeader title="عدد المعلّمين" />
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>{stats.teachers}</Typography>
              <Button onClick={() => router.push('/users')} variant="contained" size="small">إدارة المستخدمين</Button>
            </CardContent>
          </Card>
          <Card elevation={1}>
            <CardHeader title="عدد الطلاب" />
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>{stats.students}</Typography>
              <Button onClick={() => router.push('/students')} variant="contained" size="small">عرض الطلاب</Button>
            </CardContent>
          </Card>
          <Card elevation={1}>
            <CardHeader title="عدد الامتحانات" />
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>{stats.exams}</Typography>
              <Button onClick={() => router.push('/exam')} variant="contained" size="small">عرض الامتحانات</Button>
            </CardContent>
          </Card>
          <Card elevation={1}>
            <CardHeader title="عدد الفيديوهات" />
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>{stats.videos}</Typography>
              <Button onClick={() => router.push('/admin/video')} variant="contained" size="small">عرض الفيديوهات</Button>
            </CardContent>
          </Card>
          <Card elevation={1}>
            <CardHeader title="عدد المسؤولين" />
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>{stats.admins}</Typography>
              <Button onClick={() => router.push('/users')} variant="contained" size="small">إدارة المسؤولين</Button>
            </CardContent>
          </Card>
        </Box>
      </Stack>
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}

