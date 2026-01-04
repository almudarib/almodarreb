'use client';

import * as React from 'react';
import { Box, Container, Stack, Typography, Snackbar, Alert, LinearProgress, Paper } from '@mui/material';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [stats, setStats] = React.useState({ teachers: 0, admins: 0, students: 0, exams: 0, videos: 0 });
  const [content, setContent] = React.useState({ exams: 0, videos: 0, questions: 0 });
  const [accStats, setAccStats] = React.useState<TeacherAccountingStats[]>([]);
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [accZoom, setAccZoom] = React.useState(false);

  // لوحة ألوان الهوية البصرية للرسوم البيانية
  const brandPalette = [
    '#088395', // Teal
    '#E19800', // Gold
    '#252815', // Dark
    '#066d7a', // Teal Hover
    '#666666', // Neutral
  ];

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teachersRes, adminsRes, studentsCountRes, examsCountRes, videosCountRes, questionsCountRes, accRes] = await Promise.all([
        listUsersByKind('teacher'),
        listUsersByKind('admin'),
        countStudents({ registration_from: fromDate || undefined, registration_to: toDate || undefined }),
        countExams({ created_from: fromDate || undefined, created_to: toDate || undefined }),
        countSessions({ kind: 'video', created_from: fromDate || undefined, created_to: toDate || undefined }),
        countQuestions(),
        listTeacherAccountingStats({ from: fromDate || undefined, to: toDate || undefined }),
      ]);

      if (!teachersRes.ok || !adminsRes.ok || !studentsCountRes.ok || !examsCountRes.ok || !videosCountRes.ok || !questionsCountRes.ok || !accRes.ok) {
        throw new Error('فشل تحميل بعض البيانات');
      }

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
  }, [fromDate, toDate]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Container maxWidth="lg" sx={{ py: 4, bgcolor: 'var(--brand-light-bg)', minHeight: '100vh' }} dir="rtl">
      <Stack spacing={4}>
        {/* Header Section */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--brand-dark)', letterSpacing: '-0.5px' }}>
              لوحة التحكم
            </Typography>
            <Typography variant="body1" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
              متابعة الأداء العام والمؤشرات المالية للمنصة
            </Typography>
          </Box>
        </Stack>

        {/* Filter Section */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            borderRadius: '16px', 
            border: '1px solid var(--neutral-200)',
            bgcolor: 'var(--brand-white)',
            boxShadow: '0 4px 20px var(--black-03)'
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
            <Box sx={{ flex: 1, width: '100%' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block', color: 'var(--brand-teal)' }}>من تاريخ</Typography>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full" />
            </Box>
            <Box sx={{ flex: 1, width: '100%' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block', color: 'var(--brand-teal)' }}>إلى تاريخ</Typography>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full" />
            </Box>
            <Button 
              onClick={() => load()} 
              sx={{ 
                height: '42px', 
                px: 4, 
                bgcolor: 'var(--brand-teal)', 
                '&:hover': { bgcolor: 'var(--brand-teal-hover)' },
                alignSelf: { xs: 'stretch', md: 'flex-end' }
              }}
            >
              تحديث البيانات
            </Button>
          </Stack>
        </Paper>

        {loading && <LinearProgress sx={{ borderRadius: 2, height: 6, bgcolor: 'var(--brand-teal-13)', '& .MuiLinearProgress-bar': { bgcolor: 'var(--brand-teal)' } }} />}

        {/* Charts Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          {/* User Stats */}
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader 
              title="توزيع المستخدمين" 
              className="bg-[var(--brand-teal-13)] text-[var(--brand-teal)] font-bold"
            />
            <CardContent className="pt-6">
              <Box sx={{ height: 320 }}>
                <ResponsivePie
                  data={[
                    { id: 'الطلاب', label: 'الطلاب', value: stats.students },
                    { id: 'المعلّمين', label: 'المعلّمين', value: stats.teachers },
                    { id: 'المسؤولين', label: 'المسؤولين', value: stats.admins },
                  ]}
                  margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                  innerRadius={0.6}
                  padAngle={2}
                  cornerRadius={5}
                  colors={brandPalette}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  enableArcLinkLabels={false}
                  legends={[{
                    anchor: 'bottom', direction: 'row', translateY: 50, itemWidth: 80, itemHeight: 18, symbolSize: 12, symbolShape: 'circle'
                  }]}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Content Stats */}
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader 
              title="محتوى المنصة" 
              className="bg-[var(--brand-gold-13)] text-[var(--brand-gold)] font-bold"
            />
            <CardContent className="pt-6">
              <Box sx={{ height: 320 }}>
                <ResponsiveBar
                  data={[
                    { category: 'الامتحانات', value: content.exams },
                    { category: 'الفيديوهات', value: content.videos },
                    { category: 'الأسئلة', value: content.questions },
                  ]}
                  keys={['value']}
                  indexBy="category"
                  margin={{ top: 10, right: 10, bottom: 50, left: 40 }}
                  padding={0.4}
                  colors={brandPalette}
                  borderRadius={6}
                  axisLeft={{ tickSize: 0, tickPadding: 10 }}
                  enableGridY={false}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Accounting Section */}
        <Card className="border-none shadow-lg border-t-4 border-t-[var(--brand-teal)]">
          <CardHeader 
            title="مستحقات الأساتذة (Accounting)" 
            action={
              <Button variant="outlined" size="small" onClick={() => setAccZoom(!accZoom)}>
                {accZoom ? 'تصغير' : 'تكبير العرض'}
              </Button>
            }
          />
          <CardContent>
            <Box sx={{ height: accZoom ? 600 : 350, transition: 'height 0.3s ease' }}>
              <ResponsiveBar
                data={accStats.map((s) => ({
                  name: s.teacher_name || `#${s.teacher_id}`,
                  amount: s.total_due,
                }))}
                keys={['amount']}
                indexBy="name"
                margin={{ top: 20, right: 30, bottom: 70, left: 60 }}
                padding={0.3}
                layout="vertical"
                colors={'#088395'} // Teal for money
                borderRadius={4}
                valueFormat={v => `$${v}`}
                axisBottom={{
                  tickRotation: -45,
                }}
              />
            </Box>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button 
                onClick={() => router.push('/admin/accounting')} 
                className="bg-[var(--brand-dark)] hover:bg-black text-white"
              >
                فتح السجل المالي الكامل
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}>
        <Alert severity="error" variant="filled" sx={{ width: '100%', borderRadius: '12px' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}
