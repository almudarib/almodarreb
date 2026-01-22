 'use server';
 
 import { listUsersByKind } from '@/app/actions/users';
 import { countStudents } from '@/app/actions/students';
 import { countExams, countQuestions } from '@/app/actions/exam';
 import { countSessions } from '@/app/actions/video';
 import { listTeacherAccountingStats, type TeacherAccountingStats } from '@/app/actions/accounting';
 
 export type AdminDashboardData = {
   stats: {
     teachers: number;
     admins: number;
     students: number;
     exams: number;
     videos: number;
   };
   content: {
     exams: number;
     videos: number;
     questions: number;
   };
   accStats: TeacherAccountingStats[];
 };
 
 export async function getAdminDashboardStats(input: {
   from?: string;
   to?: string;
 }): Promise<AdminDashboardData> {
   const from = input?.from || undefined;
   const to = input?.to || undefined;
 
   const [
     teachersRes,
     adminsRes,
     studentsCountRes,
     examsCountRes,
     videosCountRes,
     questionsCountRes,
     accRes,
   ] = await Promise.all([
     listUsersByKind('teacher'),
     listUsersByKind('admin'),
     countStudents({ registration_from: from, registration_to: to }),
     countExams({ created_from: from, created_to: to }),
     countSessions({ kind: 'video', created_from: from, created_to: to }),
     countQuestions(),
     listTeacherAccountingStats({ from, to }),
   ]);
 
   const ok =
     teachersRes.ok &&
     adminsRes.ok &&
     studentsCountRes.ok &&
     examsCountRes.ok &&
     videosCountRes.ok &&
     questionsCountRes.ok &&
     accRes.ok;
   if (!ok) {
     const firstError =
       !teachersRes.ok
         ? teachersRes.error
         : !adminsRes.ok
         ? adminsRes.error
         : !studentsCountRes.ok
         ? studentsCountRes.error
         : !examsCountRes.ok
         ? examsCountRes.error
         : !videosCountRes.ok
         ? videosCountRes.error
         : !questionsCountRes.ok
         ? questionsCountRes.error
         : !accRes.ok
         ? accRes.error
         : 'فشل تحميل بعض البيانات';
     throw new Error(firstError || 'فشل تحميل بعض البيانات');
   }
 
   return {
     stats: {
       teachers: (teachersRes.users ?? []).length,
       admins: (adminsRes.users ?? []).length,
       students: studentsCountRes.total ?? 0,
       exams: examsCountRes.total ?? 0,
       videos: videosCountRes.total ?? 0,
     },
     content: {
       exams: examsCountRes.total ?? 0,
       videos: videosCountRes.total ?? 0,
       questions: questionsCountRes.total ?? 0,
     },
     accStats: accRes.stats ?? [],
   };
 }
