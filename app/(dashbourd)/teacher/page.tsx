'use client';
import * as React from 'react';
import Link from 'next/link';
import { Container, Stack, Typography, Box, LinearProgress, Snackbar, Alert } from '@mui/material';
import { Card, CardHeader, CardContent, CardActions, Button } from '@/components/ui';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { countStudentsByStatusForCurrentTeacher, type StudentStatusCounts } from '@/app/actions/students';
import { getCurrentTeacherAccountingDetails, type TeacherAccountingDetails } from '@/app/actions/accounting';

export default function Page() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusCounts, setStatusCounts] = React.useState<StudentStatusCounts>({
    active: 0,
    inactive: 0,
    passed: 0,
    failed: 0,
    total: 0,
  });
  const [accDetails, setAccDetails] = React.useState<TeacherAccountingDetails | null>(null);

  const brandPalette = [
    '#088395',
    '#E19800',
    '#252815',
    '#066d7a',
    '#666666',
  ];

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [countsRes, detailsRes] = await Promise.all([
        countStudentsByStatusForCurrentTeacher(),
        getCurrentTeacherAccountingDetails(),
      ]);
      if (!countsRes.ok || !detailsRes.ok) {
        throw new Error('فشل تحميل بيانات الأستاذ');
      }
      setStatusCounts(countsRes.counts);
      setAccDetails(detailsRes.details);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>لوحة الأستاذ</Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
            نظرة عامة سريعة وروابط للإدارة
          </Typography>
        </Box>
      </Stack>

      {loading && (
        <LinearProgress sx={{ borderRadius: 2, height: 6, bgcolor: 'var(--brand-teal-13)', '& .MuiLinearProgress-bar': { bgcolor: 'var(--brand-teal)' }, mb: 3 }} />
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <Card>
          <CardHeader
            title="توزيع حالات الطلاب"
          />
          <CardContent>
            <Box sx={{ height: 320 }}>
              <ResponsivePie
                data={[
                  { id: 'نشط', label: 'نشط', value: statusCounts.active },
                  { id: 'غير نشط', label: 'غير نشط', value: statusCounts.inactive },
                  { id: 'ناجح', label: 'ناجح', value: statusCounts.passed },
                  { id: 'راسب', label: 'راسب', value: statusCounts.failed },
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

        <Card>
          <CardHeader
            title="مستحقات الطلاب"
          />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveBar
                data={(accDetails?.students ?? []).map((s) => ({
                  name: s.student_name || `#${s.student_id}`,
                  amount: s.pending_amount,
                }))}
                keys={['amount']}
                indexBy="name"
                margin={{ top: 20, right: 30, bottom: 70, left: 60 }}
                padding={0.3}
                layout="vertical"
                colors={'#088395'}
                borderRadius={4}
                valueFormat={v => `${v}`}
                axisBottom={{
                  tickRotation: -45,
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Card sx={{ flex: 1 }}>
          <CardHeader
            title={
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>
                إدارة الطلاب
              </Typography>
            }
          />
          <CardContent>
            <Typography variant="body2" sx={{ color: 'var(--neutral-700)' }}>
              عرض وتحرير بيانات الطلاب ومراجعة حالاتهم.
            </Typography>
          </CardContent>
          <CardActions sx={{ justifyContent: 'flex-end' }}>
            <Link href="/teacher/students" legacyBehavior>
              <Button component="a" variant="contained">
                فتح صفحة الطلاب
              </Button>
            </Link>
          </CardActions>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardHeader
            title={
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--brand-dark)' }}>
                روابط سريعة
              </Typography>
            }
          />
          <CardContent>
            <Stack spacing={1.5}>
              <Link href="/teacher/students" legacyBehavior>
                <Button component="a" variant="outlined">
                  إدارة الطلاب
                </Button>
              </Link>
              <Link href="/teacher/accounting" legacyBehavior>
                <Button component="a" variant="outlined">
                  حسابك مع المدير
                </Button>
              </Link>
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
