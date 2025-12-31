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
};

export type DataTableProps<T> = Omit<MUITableProps, 'children'> & {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: React.ReactNode;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (columnId: string, direction: 'asc' | 'desc') => void;
  getRowId?: (row: T, index: number) => React.Key;
};

export function Table<T>({
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
    <TableContainer component={Paper}>
      <MUITable {...rest}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.id} align={col.align}>
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
                <TableRow key={key} hover>
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align}>
                      {col.render
                        ? col.render(row)
                        : (row as any)[col.id] !== undefined
                        ? (row as any)[col.id]
                        : null}
                    </TableCell>
                  ))}
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
