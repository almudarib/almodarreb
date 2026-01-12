'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Box, Stack, Typography, Pagination, MenuItem, 
  Chip, Grid, Paper, Tooltip, InputAdornment
} from '@mui/material';
import Table, { type Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, FilterList, Add, CheckCircle, Cancel, HourglassEmpty 
} from '@mui/icons-material';
import StudentActions from '@/components/student/StudentActions';
import StudentDetailsModal from '@/components/student/StudentDetailsModal';
import StudentEditModal from '@/components/student/StudentEditModal';
import AddStudentModal from '@/components/student/AddStudentModal';
import { updateStudent, type StudentRecord } from '@/app/actions/students';
import { TextField as MuiTextField } from '@mui/material';
import { StudentUIProvider } from '@/components/student/StudentUIContext';

// --- تعريف الأنواع (Interfaces) لضمان عدم ظهور أخطاء Cannot find name ---
export type StudentWithTeacher = StudentRecord & {
  teacher_name?: string;
};

export interface StudentTableProps {
  students: StudentWithTeacher[];
  page: number;
  perPage: number;
  total: number | null;
  sortBy: 'created_at' | 'name' | 'exam_datetime' | 'registration_date';
  sortDir: 'asc' | 'desc';
  initialSearch?: string;
  defaultTeacherId?: number;
  lockTeacherAdd?: boolean;
}

// --- مساعدات التنسيق البصري ---
const getStatusChip = (status?: string) => {
  switch (status) {
    case 'passed': return <Chip label="ناجح" color="success" size="small" icon={<CheckCircle />} sx={{ fontWeight: 600 }} />;
    case 'failed': return <Chip label="راسب" color="error" size="small" icon={<Cancel />} sx={{ fontWeight: 600 }} />;
    case 'active': return <Chip label="نشط" color="primary" size="small" icon={<HourglassEmpty />} sx={{ fontWeight: 600 }} />;
    default: return <Chip label="غير معروف" variant="outlined" size="small" />;
  }
};

export function StudentTable({
  students,
  page,
  perPage,
  total,
  sortBy,
  sortDir,
  initialSearch,
  defaultTeacherId,
  lockTeacherAdd,
}: StudentTableProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = React.useState(initialSearch ?? '');
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [status, setStatus] = React.useState<string | undefined>(undefined);
  const [showExams, setShowExams] = React.useState<boolean | undefined>(undefined);
  const [examFrom, setExamFrom] = React.useState<string>('');
  const [examTo, setExamTo] = React.useState<string>('');
  const [selected, setSelected] = React.useState<StudentWithTeacher | null>(null);

  React.useEffect(() => {
    const qp = new URLSearchParams(params.toString());
    setStatus(qp.get('status') ?? undefined);
    const se = qp.get('show_exams');
    setShowExams(se === null ? undefined : se === 'true');
    setExamFrom(qp.get('exam_datetime_from') ?? '');
    setExamTo(qp.get('exam_datetime_to') ?? '');
  }, [params]);

  React.useEffect(() => {
    const current = params.get('search') ?? '';
    if (current === search) return;
    const handle = window.setTimeout(() => {
      const qp = new URLSearchParams(params.toString());
      if (search) qp.set('search', search);
      else qp.delete('search');
      qp.set('page', '1');
      router.push(`?${qp.toString()}`);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [search, params, router]);

  const formatDate = (value: string | null) => {
    if (!value) return 'غير معرف';
    const d = new Date(String(value));
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const h24 = d.getHours();
    const isPm = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const hh = String(h12).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const suffix = isPm ? 'م' : 'ص';
    return `${dd}-${mm}-${yyyy}  ${hh}:${mi}${suffix}`;
  };

  const columns: Column<StudentWithTeacher>[] = [
    {
      id: 'name',
      label: 'الاسم الكامل',
      sortable: true,
      render: (row) => (
        <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
      )
    },
    {
        id: 'status',
        label: 'الحالة',
        render: (row) => getStatusChip(row.status)
    },
    {
      id: 'national_id',
      label: 'رقم الهوية',
      render: (row) => (
        <Typography variant="body2" color={/^\d{10,20}$/.test(String(row.national_id)) ? 'text.secondary' : 'error'}>
          {row.national_id}
        </Typography>
      ),
    },
    {
      id: 'teacher_name',
      label: 'المعلم المشرف',
      render: (row) => (
        <Chip label={row.teacher_name ?? 'غير محدد'} variant="outlined" size="small" sx={{ borderRadius: '8px' }} />
      ),
    },
    {
      id: 'exam_datetime',
      label: 'تاريخ الامتحان',
      sortable: true,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(row.exam_datetime)}
        </Typography>
      ),
    },
    {
      id: 'notes',
      label: 'ملاحظات',
      render: (row) => <InlineNotes student={row} />,
    },
    {
      id: 'actions',
      label: 'خيارات',
      align: 'right',
      render: (row) => (
        <StudentActions
          student={row}
          onOpenDetails={(s) => {
            setSelected(s as StudentWithTeacher);
            setDetailsOpen(true);
          }}
          onOpenEdit={(s) => {
            setSelected(s as StudentWithTeacher);
            setEditOpen(true);
          }}
        />
      ),
    },
  ];

  const applyFilters = () => {
    const qp = new URLSearchParams(params.toString());
    const fields = { status, show_exams: showExams, exam_datetime_from: examFrom, exam_datetime_to: examTo };
    Object.entries(fields).forEach(([key, val]) => {
      if (val !== undefined && val !== '') qp.set(key, String(val));
      else qp.delete(key);
    });
    qp.set('page', '1');
    router.push(`?${qp.toString()}`);
  };

  return (
    <Box dir="rtl">
      <StudentUIProvider value={{ 
          addOpen, 
          setAddOpen, 
          selectedId: selected?.id ?? null, 
          setSelectedId: (id) => setSelected(students.find(x => x.id === id) ?? null) 
      }}>
        <Stack spacing={3}>
          
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>قائمة الطلاب</Typography>
                <Typography color="text.secondary">إدارة بيانات الطلاب والملاحظات</Typography>
            </Box>
            <Button 
                variant="contained" 
                className="bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-hover)] text-white gap-2 px-6 h-12 rounded-xl"
                onClick={() => setAddOpen(true)}
            >
              <Add /> إضافة طالب جديد
            </Button>
          </Stack>

          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid var(--neutral-200)' }}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid size={{ xs: 12, md: 4 }}>
                <Input
                  placeholder="ابحث بالاسم، الهوية، أو المعلم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'var(--neutral-400)', ml: 1 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <Input
                  select
                  value={status ?? ''}
                  onChange={(e: any) => setStatus(e.target.value || undefined)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="active">نشط</MenuItem>
                  <MenuItem value="passed">ناجح</MenuItem>
                  <MenuItem value="failed">راسب</MenuItem>
                </Input>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <MuiTextField
                  label="من تاريخ"
                  type="date"
                  fullWidth
                  value={examFrom}
                  onChange={(e) => setExamFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <MuiTextField
                  label="إلى تاريخ"
                  type="date"
                  fullWidth
                  value={examTo}
                  onChange={(e) => setExamTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 1 }}>
                <Button variant="outlined" className="w-full h-10" onClick={applyFilters}>
                  تصفية
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--neutral-200)' }}>
            <Table
              columns={columns}
              data={students}
              sortBy={sortBy}
              sortDirection={sortDir}
              onSortChange={(id, dir) => {
                const qp = new URLSearchParams(params.toString());
                qp.set('sort_by', id); qp.set('sort_dir', dir);
                router.push(`?${qp.toString()}`);
              }}
              getRowId={(r) => r.id}
            />
          </Paper>

          <Stack direction="row" justifyContent="center">
            <Pagination
              count={Math.max(1, Math.ceil((total ?? students.length) / perPage))}
              page={page}
              onChange={(_, p) => {
                const qp = new URLSearchParams(params.toString());
                qp.set('page', String(p));
                router.push(`?${qp.toString()}`);
              }}
              color="primary"
            />
          </Stack>
        </Stack>

        <StudentDetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} student={selected} teacherName={selected?.teacher_name} />
        <StudentEditModal open={editOpen} onClose={() => setEditOpen(false)} student={selected} />
        <AddStudentModal open={addOpen} onClose={() => setAddOpen(false)} defaultTeacherId={defaultTeacherId} lockTeacher={lockTeacherAdd} />
      </StudentUIProvider>
    </Box>
  );
}

function InlineNotes({ student }: { student: StudentWithTeacher }) {
  const router = useRouter();
  const [val, setVal] = React.useState(student.notes ?? '');
  const [saving, setSaving] = React.useState(false);

  const onBlur = async () => {
    if ((student.notes ?? '') === val) return;
    setSaving(true);
    const r = await updateStudent({ id: student.id, notes: val });
    setSaving(false);
    if (r.ok) router.refresh();
  };

  return (
    <Tooltip title="اضغط للتعديل">
      <MuiTextField
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={onBlur}
        size="small"
        placeholder="..."
        variant="standard"
        disabled={saving}
        InputProps={{
          disableUnderline: true,
          sx: { 
            fontSize: '0.85rem', 
            bgcolor: 'var(--neutral-50)', 
            px: 1, 
            borderRadius: '4px'
          }
        }}
      />
    </Tooltip>
  );
}

export default StudentTable;
