import { getDashboardStats } from '@/app/actions/dashboard';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboardPage() {
  const res = await getDashboardStats();
  const initialStats = res.ok
    ? res.stats
    : { teachers: 0, admins: 0, students: 0, exams: 0, videos: 0, questions: 0 };
  const initialAccStats = res.ok ? res.accStats : [];
  return <AdminDashboardClient initialStats={initialStats} initialAccStats={initialAccStats} />;
}
