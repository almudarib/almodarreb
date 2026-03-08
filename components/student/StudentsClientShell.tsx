 'use client';
 import * as React from 'react';
 import { Box, Typography } from '@mui/material';
 import { useSearchParams } from 'next/navigation';
 import TeacherFilterBar from '@/components/student/TeacherFilterBar';
 import { type FilterOption } from '@/components/FilterBar';
 import { StudentBulkProvider } from '@/components/student/StudentBulkContext';
 
 export default function StudentsClientShell({
   teacherOptions,
   initialTeacherId,
   children,
 }: {
   teacherOptions: FilterOption[];
   initialTeacherId?: number;
   children: React.ReactNode;
 }) {
   const [loading, setLoading] = React.useState(false);
   const sp = useSearchParams();
   React.useEffect(() => {
     setLoading(false);
   }, [initialTeacherId, sp?.toString()]);
  const selectedTeacherId = initialTeacherId;
  const selectedTeacherName = React.useMemo(() => {
    if (selectedTeacherId === undefined || selectedTeacherId === null) return undefined;
    const match = teacherOptions.find((o) => o.value === selectedTeacherId);
    return match?.label;
  }, [teacherOptions, selectedTeacherId]);
   return (
     <Box>
       <TeacherFilterBar
         options={teacherOptions}
         initialTeacherId={initialTeacherId}
         onNavigating={() => setLoading(true)}
       />
      <StudentBulkProvider teacherId={selectedTeacherId} teacherName={selectedTeacherName}>
         {loading ? (
           <Box sx={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
             <Box sx={{ width: 48, height: 48, border: '4px solid #f3f3f3', borderTop: '4px solid var(--brand-teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
             <Typography sx={{ color: 'var(--neutral-500)', fontWeight: 600 }}>جارٍ التحميل...</Typography>
             <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
           </Box>
         ) : (
           children
         )}
       </StudentBulkProvider>
     </Box>
   );
 }
