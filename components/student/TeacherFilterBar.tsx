 'use client';
 import * as React from 'react';
 import { usePathname, useRouter, useSearchParams } from 'next/navigation';
 import FilterBar, { type FilterOption } from '@/components/FilterBar';
 
 export default function TeacherFilterBar({
   options,
   initialTeacherId,
  onNavigating,
 }: {
   options: FilterOption[];
   initialTeacherId?: number;
  onNavigating?: () => void;
 }) {
   const router = useRouter();
   const pathname = usePathname();
   const sp = useSearchParams();
   const [filters, setFilters] = React.useState<Record<string, unknown>>({
     teacher_id: initialTeacherId ?? '',
   });
 
   function apply(current: Record<string, unknown>) {
     const params = new URLSearchParams(sp?.toString() ?? '');
     const tid = current.teacher_id as string | number | undefined;
     if (tid === undefined || tid === null || tid === '' || Number(tid) <= 0) {
       params.delete('teacher_id');
     } else {
       params.set('teacher_id', String(tid));
     }
    params.set('page', '1');
    onNavigating?.();
     router.push(`${pathname}?${params.toString()}`);
   }
 
   function reset() {
     const params = new URLSearchParams(sp?.toString() ?? '');
     params.delete('teacher_id');
     router.push(`${pathname}?${params.toString()}`);
     setFilters({ teacher_id: '' });
   }
 
   return (
     <FilterBar
       fields={[
         {
           id: 'teacher_id',
           label: 'المعلم',
           type: 'select',
           options,
           placeholder: 'اختر معلم',
         },
       ]}
       value={filters}
       onChange={setFilters}
       onApply={apply}
       onReset={reset}
      autoApplyOnChange
      hideActions
       applyText="تطبيق"
       resetText="مسح"
       sx={{ mb: 2 }}
     />
   );
 }
