import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getTeacherAccountingDetails,
  type TeacherAccountingDetails,
  type StudentAmount,
} from '@/app/actions/accounting';
import { Suspense } from 'react';
import { Container, Stack, Typography, Box, Alert } from '@mui/material';
import { Card, CardContent, CardHeader } from '@/components/ui';
import AccountingTable from '@/components/teacher/AccountingTable';

function formatCurrency(n: number) {
  try {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
      n || 0,
    );
  } catch {
    return `${n}`;
  }
}

async function AccountingContent() {
  const supa = await createServerClient();
  const { data: u } = await supa.auth.getUser();
  const uid = u.user?.id ?? null;
  if (!uid) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
        <Alert severity="error" sx={{ borderRadius: '12px' }}>غير مصرح</Alert>
      </Container>
    );
  }
  const admin = createAdminClient();
  const { data: me } = await admin.from('users').select('id').eq('auth_user_id', uid).maybeSingle();
  const teacherId = (me?.id as number | undefined) ?? undefined;
  if (!teacherId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
        <Alert severity="error" sx={{ borderRadius: '12px' }}>لم يتم العثور على معرّف الأستاذ</Alert>
      </Container>
    );
  }

  const res = await getTeacherAccountingDetails(teacherId);
  if (!res.ok) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
        <Alert severity="error" sx={{ borderRadius: '12px' }}>{res.error}</Alert>
      </Container>
    );
  }
  const details = res.details as TeacherAccountingDetails;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>حسابك مع المدير</Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
            عرض عدد الطلاب والمبالغ المستحقة عليك
          </Typography>
        </Box>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
        <Card elevation={1} sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">عدد الطلاب</Typography>
              <Typography variant="h5">{details.students_count}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">الطلاب المرتبطون بك</Typography>
          </CardContent>
        </Card>
        <Card elevation={1} sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">المبلغ المستحق</Typography>
              <Typography variant="h5" color="success.main">{formatCurrency(details.total_due)}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">إجمالي الإدخالات المعلقة</Typography>
          </CardContent>
        </Card>
        <Card elevation={1} sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">الرسوم لكل طالب</Typography>
              <Typography variant="h6">{details.per_student_fee ?? 0}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">القيمة الافتراضية إن وجدت</Typography>
          </CardContent>
        </Card>
      </Stack>

      <Card>
        <CardHeader title="تفاصيل الطلاب والمبالغ" />
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <AccountingTable data={details.students} />
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default function Page() {
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
      <AccountingContent />
    </Suspense>
  );
}
