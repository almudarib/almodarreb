 'use client';
 
 import * as React from 'react';
import {
  Box,
  Container,
  Stack,
  Typography,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Table } from '@/components/ui/Table';
import { Button, Input, Card, CardHeader, CardContent, Modal, DeleteWarning } from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import { VisibilityOutlined, DeleteOutline } from '@mui/icons-material';
  import {
    listTeacherAccountingStats,
    getTeacherAccountingDetails,
    applyTeacherPayment,
    initializeDefaultFeeForTeacher,
    initializeDefaultFeeForAllTeachers,
    deleteTeacherAccountingPending,
    type TeacherAccountingStats,
    type TeacherAccountingDetails,
    type StudentAmount,
  } from '@/app/actions/accounting';
 import { createClient as createSupabaseClient } from '@/lib/supabase/client';
 
 export default function Page() {
   const [stats, setStats] = React.useState<TeacherAccountingStats[]>([]);
   const [loading, setLoading] = React.useState(false);
  const [, setError] = React.useState<string | null>(null);
 
   const [detailsOpen, setDetailsOpen] = React.useState(false);
   const [selectedTeacherId, setSelectedTeacherId] = React.useState<number | null>(null);
   const [details, setDetails] = React.useState<TeacherAccountingDetails | null>(null);
   const [paymentAmount, setPaymentAmount] = React.useState<string>('');
 
  const [initOpen, setInitOpen] = React.useState(false);
  const [initFee, setInitFee] = React.useState<string>('20');
  const [toast, setToast] = React.useState<{ open: boolean; kind: 'success' | 'error'; msg: string }>({
    open: false,
    kind: 'success',
    msg: '',
  });
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TeacherAccountingStats | null>(null);
 
  async function loadStats() {
    setLoading(true);
    const res = await listTeacherAccountingStats();
    if (res.ok) {
      setStats(res.stats.filter((s) => (s.total_due || 0) > 0));
      setError(null);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }
 
   async function loadDetailsById(id: number) {
     const res = await getTeacherAccountingDetails(id);
     if (res.ok) {
       setDetails(res.details);
     } else {
       setToast({ open: true, kind: 'error', msg: res.error });
     }
   }
 
  React.useEffect(() => {
    loadStats();
    const supabase = createSupabaseClient();
    const channelAcc = supabase
      .channel('accounting-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounting' },
        () => {
          loadStats();
          if (selectedTeacherId !== null) {
            loadDetailsById(selectedTeacherId);
          }
        },
      );
    const channelStudents = supabase
      .channel('students-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => {
          loadStats();
          if (selectedTeacherId !== null) {
            loadDetailsById(selectedTeacherId);
          }
        },
      );
    channelAcc.subscribe();
    channelStudents.subscribe();
    return () => {
      supabase.removeChannel(channelAcc);
      supabase.removeChannel(channelStudents);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  function formatCurrency(n: number) {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
        n || 0,
      );
    } catch {
      return `${n}`;
    }
  }

  function formatNumberEn(n: number) {
    try {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0);
    } catch {
      return `${n}`;
    }
  }

  const totals = React.useMemo(() => {
    const teacherCount = stats.length;
    const studentsCount = stats.reduce((sum, s) => sum + (s.students_count || 0), 0);
    const totalDue = stats.reduce((sum, s) => sum + (s.total_due || 0), 0);
    return { teacherCount, studentsCount, totalDue };
  }, [stats]);

  const columns: Column<TeacherAccountingStats>[] = [
    { id: 'teacher_name', label: 'الأستاذ' },
    {
      id: 'total_due',
      label: 'القيمة التي يجب أن يدفعها',
      render: (row: TeacherAccountingStats) => <Typography color="success.main">{formatCurrency(row.total_due)}</Typography>,
    },
     {
       id: 'actions',
       label: 'الإجراءات',
       align: 'left',
       render: (row: TeacherAccountingStats) => (
         <Stack direction="row" spacing={1} alignItems="center">
           <Tooltip title="عرض التفاصيل">
             <IconButton
               color="primary"
               size="small"
               onClick={async () => {
                 setSelectedTeacherId(row.teacher_id);
                 setDetailsOpen(true);
                 await loadDetailsById(row.teacher_id);
               }}
             >
               <VisibilityOutlined fontSize="small" />
             </IconButton>
           </Tooltip>
           <Tooltip title="حذف الإدخالات المعلقة">
             <IconButton
               color="error"
               size="small"
               onClick={() => {
                 setDeleteTarget(row);
                 setDeleteOpen(true);
               }}
             >
               <DeleteOutline fontSize="small" />
             </IconButton>
           </Tooltip>
         </Stack>
       ),
     },
   ];
 
   async function handleApplyPayment() {
     if (!selectedTeacherId) return;
     const amt = Number(paymentAmount);
     if (!Number.isFinite(amt) || amt <= 0) {
       setToast({ open: true, kind: 'error', msg: 'الرجاء إدخال مبلغ صالح' });
       return;
     }
     const res = await applyTeacherPayment({ teacher_id: selectedTeacherId, amount: amt });
     if (res.ok) {
       setToast({
         open: true,
         kind: 'success',
         msg: `تم تطبيق ${formatCurrency(res.applied_amount)}. المتبقي غير مطبق: ${formatCurrency(res.remaining_unapplied)}`,
       });
       setPaymentAmount('');
       await loadStats();
       await loadDetailsById(selectedTeacherId);
    } else {
      setToast({ open: true, kind: 'error', msg: res.error });
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const res = await deleteTeacherAccountingPending(deleteTarget.teacher_id);
    if (res.ok) {
      setToast({ open: true, kind: 'success', msg: `تم حذف ${formatNumberEn(res.deleted)} إدخالات معلقة` });
      setDeleteOpen(false);
      setDeleteTarget(null);
      await loadStats();
      if (selectedTeacherId !== null) {
        await loadDetailsById(selectedTeacherId);
      }
    } else {
      setToast({ open: true, kind: 'error', msg: res.error });
    }
  }

  async function handleInitDefault() {
    const fee = Number(initFee);
    if (!Number.isFinite(fee) || fee < 0) {
      setToast({ open: true, kind: 'error', msg: 'القيمة الافتراضية غير صالحة' });
      return;
    }
    const teacherIds = stats.map((s) => s.teacher_id);
    let totalInserted = 0;
    let totalDeleted = 0;
    for (const tid of teacherIds) {
      const r = await initializeDefaultFeeForTeacher(tid, fee, { overwriteExisting: true });
      if (!r.ok) {
        setToast({ open: true, kind: 'error', msg: r.error });
        return;
      }
      totalInserted += r.inserted;
      totalDeleted += r.deleted;
    }
    setToast({
      open: true,
      kind: 'success',
      msg: `تم تهيئة الرسوم الافتراضية لعدد ${formatNumberEn(teacherIds.length)} أستاذ بقيمة ${formatCurrency(fee)}. أضيفت ${formatNumberEn(totalInserted)} وحُذفت ${formatNumberEn(totalDeleted)}`,
    });
    setInitOpen(false);
    await loadStats();
    if (selectedTeacherId !== null) {
      await loadDetailsById(selectedTeacherId);
    }
  }
 
  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>
            الحسابات بين الأساتذة والمدير
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--neutral-700)', mt: 0.5 }}>
            عرض الإجماليات وتطبيق المدفوعات وإدارة الرسوم الافتراضية
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setInitOpen(true)}>
          تهيئة القيمة الافتراضية
        </Button>
      </Stack>

       <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
         <Card elevation={1} sx={{ flex: 1 }}>
           <CardContent>
             <Stack direction="row" justifyContent="space-between" alignItems="center">
               <Typography variant="subtitle2">المبلغ الإجمالي</Typography>
               <Typography variant="h5" color="success.main">{formatCurrency(totals.totalDue)}</Typography>
             </Stack>
             <Typography variant="caption" color="text.secondary">إجمالي المستحقات</Typography>
           </CardContent>
         </Card>
         <Card elevation={1} sx={{ flex: 1 }}>
           <CardContent>
             <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">إجمالي الطلاب</Typography>
              <Typography variant="h5">{formatNumberEn(totals.studentsCount)}</Typography>
             </Stack>
             <Typography variant="caption" color="text.secondary">جميع الطلاب المسجلين</Typography>
           </CardContent>
         </Card>
         <Card elevation={1} sx={{ flex: 1 }}>
           <CardContent>
             <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">عدد الأساتذة</Typography>
              <Typography variant="h5">{formatNumberEn(totals.teacherCount)}</Typography>
             </Stack>
             <Typography variant="caption" color="text.secondary">الأساتذة النشطين</Typography>
           </CardContent>
         </Card>
       </Stack>

      <Card>
        <CardHeader title="جدول الحسابات" />
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <Table<TeacherAccountingStats> columns={columns} data={stats} loading={loading} />
          </Box>
        </CardContent>
      </Card>
 
      <Modal title="تهيئة القيمة الافتراضية" open={initOpen} onCancel={() => setInitOpen(false)} onSubmit={handleInitDefault}>
        <Stack spacing={2}>
          <Input
            type="number"
            label="القيمة لكل طالب (USD)"
            value={initFee}
            onChange={(e) => setInitFee((e.target as HTMLInputElement).value)}
            inputProps={{ 'aria-label': 'القيمة لكل طالب بالدولار' }}
          />
        </Stack>
      </Modal>
 
       <Modal
         title={details ? `تفاصيل: ${details.teacher_name}` : 'تفاصيل الحساب'}
         open={detailsOpen}
         onCancel={() => setDetailsOpen(false)}
         onSubmit={handleApplyPayment}
         submitText="تطبيق الدفع"
       >
        {details ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="body1">إجمالي المطلوب: {formatCurrency(details.total_due)}</Typography>
              <Typography variant="body2">عدد الطلاب: {formatNumberEn(details.students_count)}</Typography>
              <Typography variant="body2">
                القيمة الافتراضية لكل طالب: {details.per_student_fee !== null ? formatCurrency(details.per_student_fee) : 'غير محددة'}
              </Typography>
            </Box>
            <Input
              type="number"
              label="المبلغ المدفوع"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount((e.target as HTMLInputElement).value)}
              inputProps={{ 'aria-label': 'المبلغ المدفوع' }}
            />
            <Card>
              <CardHeader title="تفاصيل الطلاب" />
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 2 }}>
                  <Table<StudentAmount>
                    columns={[
                      { id: 'student_name', label: 'الطالب' },
                      {
                        id: 'pending_amount',
                        label: 'المبلغ المطلوب',
                        render: (row: StudentAmount) => formatCurrency(row.pending_amount),
                      },
                      { id: 'pending_entries', label: 'عدد السجلات', render: (row: StudentAmount) => formatNumberEn(row.pending_entries) },
                    ]}
                    data={details.students}
                  />
                </Box>
              </CardContent>
            </Card>
          </Stack>
        ) : (
          <Typography>جاري التحميل...</Typography>
        )}
       </Modal>
 
       <Snackbar
         open={toast.open}
         autoHideDuration={4000}
         onClose={() => setToast((t) => ({ ...t, open: false }))}
         anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
       >
         <Alert severity={toast.kind} onClose={() => setToast((t) => ({ ...t, open: false }))}>
           {toast.msg}
         </Alert>
      </Snackbar>
      <DeleteWarning
        open={deleteOpen}
        entityName={deleteTarget?.teacher_name}
        description="سيتم حذف الإدخالات المعلقة لهذا الأستاذ."
        impacts={[
          'لن تظهر الإدخالات المعلقة للأستاذ في الجدول',
          'لن تتأثر المدفوعات المطبقة'
        ]}
        confirmText="تأكيد الحذف"
        cancelText="إلغاء"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
      />
    </Container>
  );
 }
