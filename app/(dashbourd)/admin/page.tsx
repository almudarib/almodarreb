'use client';

import * as React from 'react';
import { Box, Container, Stack, Typography, Snackbar, Alert, LinearProgress, Paper, Divider } from '@mui/material';
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

  const cssVar = (name: string, fallback?: string) => {
    if (typeof window === 'undefined') return fallback ?? '';
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || (fallback ?? '');
  };

  const brandPalette = [
    cssVar('--brand-teal', '#0D2F57'),
    cssVar('--brand-gold', '#F5C542'),
    cssVar('--brand-dark', '#1F4E79'),
    cssVar('--brand-teal-hover', '#1F4E79'),
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
    <Container maxWidth="lg" sx={{ py: 5, minHeight: '100vh', bgcolor: '#f8fafc' }} dir="rtl">
      <Stack spacing={4}>
        {/* Header */}
 

        {/* Filters */}
        <Paper sx={{ p: 3, borderRadius: 4, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="end">
            <Box flex={1}>
              <Typography variant="caption" fontWeight={700}>من تاريخ</Typography>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </Box>
            <Box flex={1}>
              <Typography variant="caption" fontWeight={700}>إلى تاريخ</Typography>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </Box>
            <Button onClick={load} className="bg-[var(--brand-teal)] text-white hover:bg-[var(--brand-dark)]">
              تحديث البيانات
            </Button>
          </Stack>
        </Paper>

        {loading && <LinearProgress />}

        {/* Stats Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
   <Card 
  className="shadow-2xl" 
  sx={{ 
    borderRadius: '20px', 
    background: 'linear-gradient(to bottom right, #ffffff, #f8f9fa)',
    transition: 'transform 0.3s ease-in-out',
    '&:hover': { transform: 'translateY(-5px)' }
  }}
>
  <CardHeader 
    title="توزيع المستخدمين" 
    titleTypographyProps={{ variant: 'h6', fontWeight: 'bold', align: 'right' }}
    sx={{ borderBottom: '1px solid #eee', pb: 1 }}
  />
  <CardContent>
    <Box height={350} width="100%" position="relative">
      <ResponsivePie
        data={[
          { id: 'طلاب', label: 'الطلاب', value: stats.students },
          { id: 'مدرسين', label: 'المدرسين', value: stats.teachers },
          { id: 'إدارة', label: 'الإدارة', value: stats.admins },
        ]}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.7} // جعل الفتحة الداخلية أكبر لتبدو كحلقة عصرية (Donut Chart)
        padAngle={2} // إضافة مسافة بسيطة بين الأقسام
        cornerRadius={5} // جعل حواف الأقسام دائرية قليلاً
        activeOuterRadiusOffset={10} // تكبير القسم عند الوقوف عليه بالماوس
        colors={brandPalette}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        
        // تحسين ملصقات البيانات (التي تظهر فوق الرسم)
        enableArcLinkLabels={true}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        
        // تحسين الأرقام داخل الرسم
        arcLabel="value"
        arcLabelsRadiusOffset={0.5}
        arcLabelsTextColor="#ffffff"

        // إضافة وسيلة إيضاح (Legend) في الأسفل
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 70,
            itemsSpacing: 10,
            itemWidth: 80,
            itemHeight: 18,
            itemTextColor: '#666',
            itemDirection: 'right-to-left', // لدعم اللغة العربية
            itemOpacity: 1,
            symbolSize: 15,
            symbolShape: 'circle',
          }
        ]}
        // إضافة تأثيرات حركة سلسة
        motionConfig="gentle"
      />
      
      {/* إضافة إجمالي المستخدمين في منتصف الدائرة */}
      <Box
        sx={{
          position: 'absolute',
          top: '43%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}
      >
        <Typography variant="h4" fontWeight="bold" color="primary">
          {stats.students + stats.teachers + stats.admins}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          إجمالي المستخدمين
        </Typography>
      </Box>
    </Box>
  </CardContent>
</Card>

          <Card className="shadow-xl">
            <CardHeader title="محتوى المنصة" />
            <CardContent>
              <Box height={320}>
                <ResponsiveBar
                  data={[
                    { category: 'امتحانات', value: content.exams },
                    { category: 'فيديوهات', value: content.videos },
                    { category: 'أسئلة', value: content.questions },
                  ]}
                  keys={['value']}
                  indexBy="category"
                  colors={brandPalette}
                  enableLabel={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor="#ffffff"
                  margin={{ top: 20, right: 20, bottom: 50, left: 40 }}
                  padding={0.4}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Accounting */}
        <Card className="shadow-xl">
          <CardHeader title="مستحقات المدرسين" />
          <Divider />
          <CardContent>
            <Box height={400}>
              <ResponsiveBar
                data={accStats.map((s) => ({ name: s.teacher_name || `#${s.teacher_id}`, amount: s.total_due }))}
                keys={['amount']}
                indexBy="name"
                colors={cssVar('--brand-teal', '#0D2F57')}
                enableLabel={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor="#ffffff"
                margin={{ top: 20, right: 20, bottom: 80, left: 60 }}
                padding={0.3}
              />
            </Box>
            <Stack alignItems="end" mt={3}>
              <Button onClick={() => router.push('/admin/accounting')} className="bg-black text-white">
                فتح السجل المالي
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}>
        <Alert severity="error" variant="filled">{error}</Alert>
      </Snackbar>
    </Container>
  );
}
