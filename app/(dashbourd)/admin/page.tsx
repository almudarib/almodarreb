'use client';

import * as React from 'react';
import { Box, Container, Stack, Typography, Snackbar, Alert, Skeleton, Paper, Divider } from '@mui/material';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { getAdminDashboardStats, type AdminDashboardData } from '@/app/actions/dashboard';
import dynamic from 'next/dynamic';

const Pie: any = dynamic(() => import('@nivo/pie').then((m) => m.ResponsivePie), { ssr: false });
const Bar: any = dynamic(() => import('@nivo/bar').then((m) => m.ResponsiveBar), { ssr: false });

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dashboard, setDashboard] = React.useState<AdminDashboardData | null>(null);
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');

  const brandPalette = React.useMemo(() => ['#0D2F57', '#F5C542', '#1F4E79'], []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminDashboardStats({ from: fromDate || undefined, to: toDate || undefined });
      setDashboard(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const loadInitial = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminDashboardStats({ from: undefined, to: undefined });
      setDashboard(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadInitial();
  }, [loadInitial]);

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
      {loading || !dashboard ? (
        <Skeleton variant="rectangular" height={350} />
      ) : (
        <>
          <Pie
            data={[
              { id: 'طلاب', label: 'الطلاب', value: dashboard.stats.students },
              { id: 'مدرسين', label: 'المدرسين', value: dashboard.stats.teachers },
              { id: 'إدارة', label: 'الإدارة', value: dashboard.stats.admins },
            ]}
            margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
            innerRadius={0.7}
            padAngle={2}
            cornerRadius={5}
            activeOuterRadiusOffset={10}
            colors={brandPalette}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            enableArcLinkLabels={true}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: 'color' }}
            arcLabel="value"
            arcLabelsRadiusOffset={0.5}
            arcLabelsTextColor="#ffffff"
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
                itemDirection: 'right-to-left',
                itemOpacity: 1,
                symbolSize: 15,
                symbolShape: 'circle',
              },
            ]}
            motionConfig="gentle"
          />
          <Box
            sx={{
              position: 'absolute',
              top: '43%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography variant="h4" fontWeight="bold" color="primary">
              {dashboard.stats.students + dashboard.stats.teachers + dashboard.stats.admins}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              إجمالي المستخدمين
            </Typography>
          </Box>
        </>
      )}
    </Box>
  </CardContent>
</Card>

          <Card className="shadow-xl">
            <CardHeader title="محتوى المنصة" />
            <CardContent>
              <Box height={320}>
                {loading || !dashboard ? (
                  <Skeleton variant="rectangular" height={320} />
                ) : (
                  <Bar
                    data={[
                      { category: 'امتحانات', value: dashboard.content.exams },
                      { category: 'فيديوهات', value: dashboard.content.videos },
                      { category: 'أسئلة', value: dashboard.content.questions },
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
                )}
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
              {loading || !dashboard ? (
                <Skeleton variant="rectangular" height={400} />
              ) : (
                <Bar
                  data={dashboard.accStats.map((s) => ({
                    name: s.teacher_name || `#${s.teacher_id}`,
                    amount: s.total_due,
                  }))}
                  keys={['amount']}
                  indexBy="name"
                  colors={[brandPalette[0]]}
                  enableLabel={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor="#ffffff"
                  margin={{ top: 20, right: 20, bottom: 80, left: 60 }}
                  padding={0.3}
                />
              )}
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
