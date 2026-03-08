'use client';
import * as React from 'react';

export type StudentBulkContextValue = {
  excludedIds: number[];
  toggleExcluded: (id: number, excluded: boolean) => void;
  clearExcluded: () => void;
};

const StudentBulkContext = React.createContext<StudentBulkContextValue | null>(null);

export function StudentBulkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [excludedIds, setExcludedIds] = React.useState<number[]>([]);
  const toggleExcluded = React.useCallback((id: number, excluded: boolean) => {
    setExcludedIds((prev) => {
      const set = new Set(prev);
      if (excluded) set.add(id);
      else set.delete(id);
      return Array.from(set);
    });
  }, []);
  const clearExcluded = React.useCallback(() => setExcludedIds([]), []);
  const value = React.useMemo(
    () => ({ excludedIds, toggleExcluded, clearExcluded }),
    [excludedIds, toggleExcluded, clearExcluded],
  );
  return <StudentBulkContext.Provider value={value}>{children}</StudentBulkContext.Provider>;
}

export function useStudentBulkOptional() {
  return React.useContext(StudentBulkContext);
}

export function useStudentBulk() {
  const ctx = React.useContext(StudentBulkContext);
  if (!ctx) throw new Error('StudentBulkContext not found');
  return ctx;
}

