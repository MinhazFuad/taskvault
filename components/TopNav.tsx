'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 1. Add 'Instructor' to the accepted roles
export default function TopNav({ role }: { role: 'Student' | 'Corporate' | 'Instructor' }) {
  const router = useRouter();

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight">
              Task<span className="text-blue-400">Vault</span>
            </Link>
            
            <div className="hidden md:flex space-x-4">
              <Link href="/dashboard" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
              
              {/* 2. Explicitly define what each role sees */}
              {role === 'Student' && (
                <>
                  <Link href="/dashboard/courses" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">LMS Courses</Link>
                  <Link href="/dashboard/bounties" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Bounty Board</Link>
                </>
              )}

              {role === 'Corporate' && (
                <>
                  <Link href="/dashboard/manage-bounties" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Manage Bounties</Link>
                  <Link href="/dashboard/submissions" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Review Submissions</Link>
                </>
              )}

              {role === 'Instructor' && (
                <>
                  <Link href="/dashboard/create-course" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Course Builder</Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700">
              {role} View
            </span>
            <button 
              onClick={handleLogout}
              className="text-slate-300 hover:text-red-400 px-3 py-2 text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}