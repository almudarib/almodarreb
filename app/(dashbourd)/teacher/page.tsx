'use client';
import Link from 'next/link';
import { Container, Stack, Typography, Box } from '@mui/material';
import { Card, CardHeader, CardContent, CardActions, Button } from '@/components/ui';

export default function Page() {
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
    </Container>
  );
}
