 'use client';
 
 import * as React from 'react';
 import {
   Box,
   Container,
   Stack,
   Typography,
   Snackbar,
   Alert,
 } from '@mui/material';
 import { Table } from '@/components/ui/Table';
 import { Button, Input, Card, CardHeader, CardContent, Modal } from '@/components/ui';
 import type { Column } from '@/components/ui/Table';
  import {
    listTeacherAccountingStats,
    getTeacherAccountingDetails,
    applyTeacherPayment,
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
 
   async function loadStats() {
     setLoading(true);
     const res = await listTeacherAccountingStats();
     if (res.ok) {
       setStats(res.stats);
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
       return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
         n || 0,
       );
     } catch {
       return `${n}`;
     }
   }
 
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
       render: (row: TeacherAccountingStats) => (
         <Stack direction="row" spacing={1}>
           <Button
             variant="contained"
             onClick={async () => {
               setSelectedTeacherId(row.teacher_id);
               setDetailsOpen(true);
               await loadDetailsById(row.teacher_id);
             }}
           >
             عرض التفاصيل
           </Button>
           <Button
             color="error"
             variant="outlined"
             onClick={async () => {
               const res = await deleteTeacherAccountingPending(row.teacher_id);
               if (res.ok) {
                 setToast({ open: true, kind: 'success', msg: `تم حذف ${res.deleted} إدخالات معلقة` });
                 loadStats();
               } else {
                 setToast({ open: true, kind: 'error', msg: res.error });
               }
             }}
           >
             حذف
           </Button>
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
 
   async function handleInitDefault() {
     const fee = Number(initFee);
     if (!Number.isFinite(fee) || fee < 0) {
       setToast({ open: true, kind: 'error', msg: 'القيمة الافتراضية غير صالحة' });
       return;
     }
     const res = await initializeDefaultFeeForAllTeachers(fee, { overwriteExisting: true });
     if (res.ok) {
       setToast({
         open: true,
         kind: 'success',
         msg: `تم تهيئة الرسوم الافتراضية لكل الأساتذة بقيمة ${formatCurrency(fee)}`,
       });
       setInitOpen(false);
       await loadStats();
       if (selectedTeacherId !== null) {
         await loadDetailsById(selectedTeacherId);
       }
     } else {
       setToast({ open: true, kind: 'error', msg: res.error });
     }
   }
 
   return (
     <Container maxWidth="lg" sx={{ py: 4 }}>
       <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
         <Typography variant="h5">الحسابات بين الأساتذة والمدير</Typography>
         <Button variant="contained" onClick={() => setInitOpen(true)}>
           تهيئة القيمة الافتراضية
         </Button>
       </Stack>
 
       <Card>
         <CardHeader>
           <Typography>جدول الحسابات</Typography>
         </CardHeader>
         <CardContent>
          <Table<TeacherAccountingStats> columns={columns} data={stats} loading={loading} />
         </CardContent>
       </Card>
 
       <Modal title="تهيئة القيمة الافتراضية" open={initOpen} onCancel={() => setInitOpen(false)} onSubmit={handleInitDefault}>
         <Stack spacing={2}>
           <Input
             type="number"
             label="القيمة لكل طالب (USD)"
             value={initFee}
             onChange={(e) => setInitFee((e.target as HTMLInputElement).value)}
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
               <Typography variant="body2">عدد الطلاب: {details.students_count}</Typography>
               <Typography variant="body2">
                 القيمة الافتراضية لكل طالب: {details.per_student_fee !== null ? formatCurrency(details.per_student_fee) : 'غير محددة'}
               </Typography>
             </Box>
             <Input
               type="number"
               label="المبلغ المدفوع"
               value={paymentAmount}
               onChange={(e) => setPaymentAmount((e.target as HTMLInputElement).value)}
             />
             <Card>
               <CardHeader>
                 <Typography>تفاصيل الطلاب</Typography>
               </CardHeader>
               <CardContent>
                <Table<StudentAmount>
                  columns={[
                    { id: 'student_name', label: 'الطالب' },
                    {
                      id: 'pending_amount',
                      label: 'المبلغ المطلوب',
                      render: (row: StudentAmount) => formatCurrency(row.pending_amount),
                    },
                    { id: 'pending_entries', label: 'عدد السجلات' },
                  ]}
                  data={details.students}
                />
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
     </Container>
   );
 }
