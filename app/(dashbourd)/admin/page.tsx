'use client';

import * as React from 'react';
import { Box, Container, Stack, Typography, Snackbar, Alert, LinearProgress } from '@mui/material';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { listUsersByKind } from '@/app/actions/users';
import { countStudents } from '@/app/actions/students';
import { countExams, countQuestions } from '@/app/actions/exam';
import { countSessions } from '@/app/actions/video';
import { listTeacherAccountingStats, type TeacherAccountingStats } from '@/app/actions/accounting';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';

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
  const [content, setContent] = React.useState<{ exams: number; videos: number; questions: number }>({ exams: 0, videos: 0, questions: 0 });
  const [accStats, setAccStats] = React.useState<TeacherAccountingStats[]>([]);
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [palette, setPalette] = React.useState<string[]>([]);
  const [accZoom, setAccZoom] = React.useState(false);

  React.useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    const cols = [1, 2, 3, 4, 5].map((i) => `hsl(${s.getPropertyValue(`--chart-${i}`).trim()})`);
    setPalette(cols);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teachersRes, adminsRes, studentsCountRes, examsCountRes, videosCountRes, questionsCountRes, accRes] = await Promise.all([
        listUsersByKind('teacher'),
        listUsersByKind('admin'),
        countStudents({
          registration_from: fromDate || undefined,
          registration_to: toDate || undefined,
        }),
        countExams({
          created_from: fromDate || undefined,
          created_to: toDate || undefined,
        }),
        countSessions({
          kind: 'video',
          created_from: fromDate || undefined,
          created_to: toDate || undefined,
        }),
        countQuestions(),
        listTeacherAccountingStats({
          from: fromDate || undefined,
          to: toDate || undefined,
        }),
      ]);
      if (!teachersRes.ok) throw new Error(teachersRes.error);
      if (!adminsRes.ok) throw new Error(adminsRes.error);
      if (!studentsCountRes.ok) throw new Error(studentsCountRes.error);
      if (!examsCountRes.ok) throw new Error(examsCountRes.error);
      if (!videosCountRes.ok) throw new Error(videosCountRes.error);
      if (!questionsCountRes.ok) throw new Error(questionsCountRes.error);
      if (!accRes.ok) throw new Error(accRes.error);
      setStats({
        teachers: (teachersRes.users ?? []).length,
        admins: (adminsRes.users ?? []).length,
        students: studentsCountRes.total ?? 0,
        exams: examsCountRes.total ?? 0,
        videos: videosCountRes.total ?? 0,
      });
      setContent({
        exams: examsCountRes.total ?? 0,
        videos: videosCountRes.total ?? 0,
        questions: questionsCountRes.total ?? 0,
      });
      setAccStats(accRes.stats ?? []);
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Box sx={{ minWidth: 180 }}>
            <Typography variant="caption">من</Typography>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2 text-sm bg-white"
              value={fromDate}
              onChange={(e) => setFromDate((e.target as HTMLInputElement).value)}
            />
          </Box>
          <Box sx={{ minWidth: 180 }}>
            <Typography variant="caption">إلى</Typography>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2 text-sm bg-white"
              value={toDate}
              onChange={(e) => setToDate((e.target as HTMLInputElement).value)}
            />
          </Box>
          <Box sx={{ alignSelf: 'flex-end' }}>
            <Button onClick={() => load()} variant="outlined" size="small">تطبيق</Button>
          </Box>
        </Stack>
        {loading ? <LinearProgress /> : null}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Card elevation={1}>
            <CardHeader title="إحصائيات المستخدمين" />
            <CardContent>
              <Box sx={{ height: 340 }}>
                <ResponsivePie
                  data={[
                    { id: 'الطلاب', label: 'الطلاب', value: stats.students },
                    { id: 'المعلّمين', label: 'المعلّمين', value: stats.teachers },
                    { id: 'المسؤولين', label: 'المسؤولين', value: stats.admins },
                  ]}
                  margin={{ top: 20, right: 80, bottom: 60, left: 80 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor="#333333"
                  arcLinkLabelsThickness={1}
                  arcLinkLabelsColor={{ from: 'color' }}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                  colors={palette.length ? palette : undefined}
                  tooltip={(d) => (
                    <div style={{ background: 'white', padding: 6, border: '1px solid #ddd', borderRadius: 4 }}>
                      <div>{String(d.datum.label)}</div>
                      <div style={{ fontWeight: 600 }}>{Number(d.datum.value) || 0}</div>
                    </div>
                  )}
                  legends={[
                    {
                      anchor: 'bottom',
                      direction: 'row',
                      justify: false,
                      translateX: 0,
                      translateY: 40,
                      itemsSpacing: 10,
                      itemWidth: 90,
                      itemHeight: 18,
                      itemTextColor: '#555',
                      itemDirection: 'left-to-right',
                      itemOpacity: 1,
                      symbolSize: 12,
                      toggleSerie: true,
                    },
                  ]}
                />
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button onClick={() => router.push('/admin/students')} variant="outlined" size="small">عرض الطلاب</Button>
                <Button onClick={() => router.push('/admin/users')} variant="contained" size="small">إدارة المستخدمين</Button>
              </Stack>
            </CardContent>
          </Card>
          <Card elevation={1}>
            <CardHeader title="محتوى المنصّة" />
            <CardContent>
              <Box sx={{ height: 340 }}>
                <ResponsivePie
                  data={[
                    { id: 'الامتحانات', label: 'الامتحانات', value: content.exams },
                    { id: 'الفيديوهات', label: 'الفيديوهات', value: content.videos },
                    { id: 'الأسئلة', label: 'الأسئلة', value: content.questions },
                  ]}
                  margin={{ top: 20, right: 80, bottom: 60, left: 80 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor="#333333"
                  arcLinkLabelsThickness={1}
                  arcLinkLabelsColor={{ from: 'color' }}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                  colors={palette.length ? palette : undefined}
                  tooltip={(d) => (
                    <div style={{ background: 'white', padding: 6, border: '1px solid #ddd', borderRadius: 4 }}>
                      <div>{String(d.datum.label)}</div>
                      <div style={{ fontWeight: 600 }}>{Number(d.datum.value) || 0}</div>
                    </div>
                  )}
                  legends={[
                    {
                      anchor: 'bottom',
                      direction: 'row',
                      justify: false,
                      translateX: 0,
                      translateY: 40,
                      itemsSpacing: 10,
                      itemWidth: 90,
                      itemHeight: 18,
                      itemTextColor: '#555',
                      itemDirection: 'left-to-right',
                      itemOpacity: 1,
                      symbolSize: 12,
                      toggleSerie: true,
                    },
                  ]}
                />
              </Box>
              <Box sx={{ height: 260, mt: 3 }}>
                <ResponsiveBar
                  data={[
                    { category: 'الامتحانات', القيمة: content.exams },
                    { category: 'الفيديوهات', القيمة: content.videos },
                    { category: 'الأسئلة', القيمة: content.questions },
                  ]}
                  keys={['القيمة']}
                  indexBy="category"
                  margin={{ top: 10, right: 20, bottom: 50, left: 50 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={({ index }) => palette[index % palette.length] || '#69b3a2'}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'الفئة',
                    legendPosition: 'middle',
                    legendOffset: 36,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'العدد',
                    legendPosition: 'middle',
                    legendOffset: -40,
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  tooltip={(b) => (
                    <div style={{ background: 'white', padding: 6, border: '1px solid #ddd', borderRadius: 4 }}>
                      <div>{String(b.indexValue)}</div>
                      <div style={{ fontWeight: 600 }}>{Number(b.data['القيمة']) || 0}</div>
                    </div>
                  )}
                  role="img"
                />
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button onClick={() => router.push('/admin/exam')} variant="contained" size="small">عرض الامتحانات</Button>
                <Button onClick={() => router.push('/admin/video')} variant="outlined" size="small">عرض الفيديوهات</Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr' }, gap: 2 }}>
          <Card elevation={1}>
            <CardHeader title="قسم المحاسبة - ما يجب على كل أستاذ دفعه" />
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Button onClick={() => setAccZoom((z) => !z)} size="small" variant="outlined">
                  {accZoom ? 'تصغير' : 'تكبير'}
                </Button>
              </Stack>
              <Box sx={{ height: accZoom ? 480 : 320 }}>
                <ResponsiveBar
                  data={accStats.map((s) => ({
                    الأستاذ: s.teacher_name || `#${s.teacher_id}`,
                    القيمة: s.total_due,
                  }))}
                  keys={['القيمة']}
                  indexBy="الأستاذ"
                  margin={{ top: 10, right: 20, bottom: 60, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={({ index }) => palette[index % palette.length] || '#69b3a2'}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'الأستاذ',
                    legendPosition: 'middle',
                    legendOffset: 40,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'المبلغ المستحق (USD)',
                    legendPosition: 'middle',
                    legendOffset: -50,
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  valueFormat={(v) => {
                    try {
                      return new Intl.NumberFormat('ar-EG', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 2,
                      }).format(Number(v) || 0);
                    } catch {
                      return String(v);
                    }
                  }}
                  tooltip={(b) => {
                    const val = Number(b.data['القيمة']) || 0;
                    const formatted = (() => {
                      try {
                        return new Intl.NumberFormat('ar-EG', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 2,
                        }).format(val);
                      } catch {
                        return String(val);
                      }
                    })();
                    return (
                      <div style={{ background: 'white', padding: 6, border: '1px solid #ddd', borderRadius: 4 }}>
                        <div>{String(b.indexValue)}</div>
                        <div style={{ fontWeight: 600 }}>{formatted}</div>
                      </div>
                    );
                  }}
                />
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button onClick={() => router.push('/admin/accounting')} variant="contained" size="small">
                  الذهاب إلى قسم المحاسبة
                </Button>
              </Stack>
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
