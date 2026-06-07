import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import TopNav from '@/components/TopNav';
import StudentDashboard from '@/components/StudentDashboard';
import CorporateDashboard from '@/components/CorporateDashboard';
import InstructorDashboard from '@/components/InstructorDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('taskvault_session')?.value;

  if (!token) redirect('/login');

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const role = payload.role as 'Student' | 'Corporate' | 'Instructor' | 'Admin';
    const userId = payload.userId as number;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <TopNav role={role} />
        <main className="pt-8">
          {role === 'Student'    && <StudentDashboard userId={userId} />}
          {role === 'Corporate'  && <CorporateDashboard userId={userId} />}
          {role === 'Instructor' && <InstructorDashboard userId={userId} />}
          {role === 'Admin'      && <AdminDashboard />}
        </main>
      </div>
    );
  } catch (error) {
    redirect('/login');
  }
}