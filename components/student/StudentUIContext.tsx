'use client';
import * as React from 'react';

export type StudentUIContextValue = {
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
};

const StudentUIContext = React.createContext<StudentUIContextValue | null>(null);

export function StudentUIProvider({
  value,
  children,
}: {
  value: StudentUIContextValue;
  children: React.ReactNode;
}) {
  return <StudentUIContext.Provider value={value}>{children}</StudentUIContext.Provider>;
}

export function useStudentUI() {
  const ctx = React.useContext(StudentUIContext);
  if (!ctx) throw new Error('StudentUIContext not found');
  return ctx;
}

