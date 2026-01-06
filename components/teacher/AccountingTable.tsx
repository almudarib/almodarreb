'use client';
import * as React from 'react';
import { Table } from '@/components/ui/Table';
import type { Column } from '@/components/ui/Table';
import type { StudentAmount } from '@/app/actions/accounting';
import { Typography } from '@mui/material';

function formatCurrency(n: number) {
  try {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
      n || 0,
    );
  } catch {
    return `${n}`;
  }
}

export default function AccountingTable({ data }: { data: StudentAmount[] }) {
  const columns: Column<StudentAmount>[] = [
    { id: 'student_name', label: 'الطالب' },
    { id: 'pending_entries', label: 'عدد الإدخالات المعلقة' },
    {
      id: 'pending_amount',
      label: 'المبلغ المستحق',
      render: (row) => <Typography color="success.main">{formatCurrency(row.pending_amount)}</Typography>,
    },
  ];
  return <Table<StudentAmount> columns={columns} data={data} />;
}
