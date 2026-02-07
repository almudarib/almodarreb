'use client';
import * as React from 'react';
import {
  Table as MUITable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  type TableCellProps,
  type TableProps as MUITableProps,
  Paper,
} from '@mui/material';

export type Column<T> = {
  id: string;
  label: React.ReactNode;
  align?: TableCellProps['align'];
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  sx?: TableCellProps['sx'];
};

export type DataTableProps<T extends Record<string, unknown>> = Omit<MUITableProps, 'children'> & {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: React.ReactNode;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (columnId: string, direction: 'asc' | 'desc') => void;
  getRowId?: (row: T, index: number) => React.Key;
};

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyText = 'لا توجد بيانات',
  sortBy,
  sortDirection = 'asc',
  onSortChange,
  getRowId,
  ...rest
}: DataTableProps<T>) {
  function handleHeaderClick(col: Column<T>) {
    if (!col.sortable || !onSortChange) return;
    const next = sortBy === col.id && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(col.id, next);
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px var(--black-03)',
        border: '1px solid var(--neutral-300)',
        bgcolor: 'var(--brand-white)'
      }}
    >
      <MUITable size="small" {...rest}>
        <TableHead sx={{ bgcolor: 'var(--brand-white)' }}>
          <TableRow sx={{ borderBottom: '1px solid var(--neutral-200)' }}>
            {columns.map((col) => (
              <TableCell
                key={col.id}
                align={col.align}
                sx={col.sx ? [{ fontWeight: 700, color: 'var(--brand-dark)' }, col.sx as any] : { fontWeight: 700, color: 'var(--brand-dark)' }}
              >
                {col.sortable ? (
                  <TableSortLabel
                    active={sortBy === col.id}
                    direction={sortBy === col.id ? sortDirection : 'asc'}
                    onClick={() => handleHeaderClick(col)}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : (
                  col.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length}>جاري التحميل...</TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>{emptyText}</TableCell>
            </TableRow>
          ) : (
            data.map((row, idx) => {
              const key = getRowId ? getRowId(row, idx) : idx;
              return (
                <TableRow
                  key={key}
                  hover
                  sx={{
                    '&:hover': { bgcolor: 'var(--neutral-100)' }
                  }}
                >
                  {columns.map((col) => {
                    const cell = row[col.id];
                    return (
                      <TableCell key={col.id} align={col.align} sx={col.sx ? [{ color: 'var(--brand-dark)' }, col.sx as any] : { color: 'var(--brand-dark)' }}>
                        {col.render
                          ? col.render(row)
                          : cell !== undefined
                          ? (cell as React.ReactNode)
                          : null}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </MUITable>
    </TableContainer>
  );
}

export default Table;
