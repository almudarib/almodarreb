'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Stack, Typography, Pagination, TextField, MenuItem } from '@mui/material';
import Table, { type Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/button';
import type { StudentRecord } from '@/app/actions/students';
import StudentActions from '@/components/student/StudentActions';
import StudentDetailsModal from '@/components/student/StudentDetailsModal';
import AddStudentModal from '@/components/student/AddStudentModal';
import { updateStudent } from '@/app/actions/students';
import { TextField as MuiTextField } from '@mui/material';
import { StudentUIProvider } from '@/components/student/StudentUIContext';

export type StudentWithTeacher = StudentRecord & {
  teacher_name?: string;
};

export type StudentTableProps = {
  students: StudentWithTeacher[];
  page: number;
  perPage: number;
  total: number | null;
  sortBy: 'created_at' | 'name' | 'exam_datetime' | 'registration_date';
  sortDir: 'asc' | 'desc';
  initialSearch?: string;
};

export function StudentTable({
  students,
  page,
  perPage,
  total,
  sortBy,
  sortDir,
  initialSearch,
}: StudentTableProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = React.useState(initialSearch ?? '');
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [status, setStatus] = React.useState<string | undefined>(undefined);
  const [showExams, setShowExams] = React.useState<boolean | undefined>(undefined);
  const [examFrom, setExamFrom] = React.useState<string>('');
  const [examTo, setExamTo] = React.useState<string>('');
  React.useEffect(() => {
    const qp = new URLSearchParams(params.toString());
    const s = qp.get('status');
    setStatus(s ?? undefined);
    const se = qp.get('show_exams');
    setShowExams(se === null ? undefined : se === 'true');
    setExamFrom(qp.get('exam_datetime_from') ?? '');
    setExamTo(qp.get('exam_datetime_to') ?? '');
  }, [params]);
  const [selected, setSelected] = React.useState<StudentWithTeacher | null>(null);

  React.useEffect(() => {
    const currentParams = new URLSearchParams(params.toString());
    const current = currentParams.get('search') ?? '';
    const next = search ?? '';
    if (current === next) return;
    const handle = window.setTimeout(() => {
      const qp = new URLSearchParams(params.toString());
      if (next) qp.set('search', next);
      else qp.delete('search');
      qp.set('page', '1');
      router.push(`?${qp.toString()}`);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, params, router]);

  function openDetails(stu: StudentWithTeacher) {
    setSelected(stu);
    setDetailsOpen(true);
  }

  function changeSort(columnId: string, direction: 'asc' | 'desc') {
    const qp = new URLSearchParams(params.toString());
    qp.set('sort_by', columnId);
    qp.set('sort_dir', direction);
    router.push(`?${qp.toString()}`);
  }

  function changePage(newPage: number) {
    const qp = new URLSearchParams(params.toString());
    qp.set('page', String(newPage));
    router.push(`?${qp.toString()}`);
  }

  function doSearch() {
    const qp = new URLSearchParams(params.toString());
    qp.set('search', search);
    qp.set('page', '1');
    router.push(`?${qp.toString()}`);
  }
  function applyFilters() {
    const qp = new URLSearchParams(params.toString());
    if (status) qp.set('status', status);
    else qp.delete('status');
    if (showExams !== undefined) qp.set('show_exams', String(showExams));
    else qp.delete('show_exams');
    if (examFrom) qp.set('exam_datetime_from', examFrom);
    else qp.delete('exam_datetime_from');
    if (examTo) qp.set('exam_datetime_to', examTo);
    else qp.delete('exam_datetime_to');
    qp.set('page', '1');
    router.push(`?${qp.toString()}`);
  }

  const columns: Column<StudentWithTeacher>[] = [
    {
      id: 'actions',
      label: 'خيارات',
      render: (row) => (
        <StudentActions student={row} onOpenDetails={(s) => openDetails(s as StudentWithTeacher)} />
      ),
    },
    { id: 'name', label: 'الاسم الكامل', sortable: true },
    {
      id: 'national_id',
      label: 'رقم الهوية',
      render: (row) => {
        const valid = /^\d{10,20}$/.test(String(row.national_id));
        return (
          <Typography color={valid ? 'inherit' : 'error'}>
            {row.national_id}
          </Typography>
        );
      },
    },
    {
      id: 'teacher_name',
      label: 'الأستاذ المشرف',
      render: (row) => <Typography>{row.teacher_name ?? row.teacher_id}</Typography>,
    },
    {
      id: 'registration_date',
      label: 'تاريخ التسجيل',
      sortable: true,
      render: (row) => <Typography>{row.registration_date ?? '--'}</Typography>,
    },
    {
      id: 'notes',
      label: 'ملاحظات',
      render: (row) => <InlineNotes student={row} />,
    },
  ];

  const pages = Math.max(1, Math.ceil((total ?? students.length) / perPage));

  return (
    <Box dir="rtl">
      <StudentUIProvider
        value={{
          addOpen,
          setAddOpen,
          selectedId: selected?.id ?? null,
          setSelectedId: (id) => {
            const s = id ? students.find((x) => x.id === id) ?? null : null;
            setSelected(s);
          },
        }}
      >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
          <Typography variant="h5">الطلاب</Typography>
          <Button variant="contained" onClick={() => setAddOpen(true)}>
            طالب جديد
          </Button>
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            placeholder="ابحث بالاسم أو رقم الهوية أو الأستاذ المشرف"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doSearch();
            }}
          />
          <Button variant="outlined" onClick={doSearch}>
            بحث
          </Button>
          <TextField
            select
            label="الحالة"
            value={status ?? ''}
            onChange={(e) => setStatus(e.target.value || undefined)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value=""></MenuItem>
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="passed">ناجح</MenuItem>
            <MenuItem value="failed">راسب</MenuItem>
            <MenuItem value="active">نشط</MenuItem>
            <MenuItem value="inactive">غير نشط</MenuItem>
          </TextField>
          <TextField
            label="تاريخ الامتحان من"
            type="date"
            value={examFrom}
            onChange={(e) => setExamFrom(e.target.value)}
            sx={{ minWidth: 180 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="تاريخ الامتحان إلى"
            type="date"
            value={examTo}
            onChange={(e) => setExamTo(e.target.value)}
            sx={{ minWidth: 180 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            label="إظهار الاختبارات"
            value={
              showExams === undefined ? '' : showExams ? 'true' : 'false'
            }
            onChange={(e) => {
              const v = e.target.value;
              setShowExams(v === '' ? undefined : v === 'true');
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=""></MenuItem>
            <MenuItem value="true">ظاهر</MenuItem>
            <MenuItem value="false">مخفي</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={applyFilters}>
            تطبيق الفلاتر
          </Button>
        </Stack>

        <Table
          columns={columns}
          data={students}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={changeSort}
          getRowId={(r) => r.id}
        />

        <Stack direction="row" justifyContent="center">
          <Pagination
            count={pages}
            page={page}
            onChange={(_, p) => changePage(p)}
          />
        </Stack>
      </Stack>

      <StudentDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        student={selected}
        teacherName={selected?.teacher_name}
      />
      <AddStudentModal open={addOpen} onClose={() => setAddOpen(false)} />
      </StudentUIProvider>
    </Box>
  );
}

export default StudentTable;

function InlineNotes({ student }: { student: StudentWithTeacher }) {
  const router = useRouter();
  const [val, setVal] = React.useState(student.notes ?? '');
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    setVal(student.notes ?? '');
  }, [student.id, student.notes]);
  async function onBlur() {
    if ((student.notes ?? '') === val) return;
    setSaving(true);
    const r = await updateStudent({ id: student.id, notes: val });
    setSaving(false);
    if (!r.ok) alert(r.error);
    else router.refresh();
  }
  return (
    <MuiTextField
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={onBlur}
      size="small"
      disabled={saving}
    />
  );
}
