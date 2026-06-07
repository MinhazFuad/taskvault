'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InstructorDashboard({ userId }: { userId: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const res = await fetch(`/api/dashboard/instructor?id=${userId}&t=${Date.now()}`);
    const json = await res.json();
    setData(json.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [userId]);

  const handleDelete = async (courseId: number) => {
    if (!confirm("Are you sure? This will remove the course and all student progress.")) return;
    await fetch('/api/courses/delete', {
      method: 'POST',
      body: JSON.stringify({ courseId, instructorId: userId }),
      headers: { 'Content-Type': 'application/json' }
    });
    fetchData();
  };

  if (loading) return <div className="text-center p-16 text-slate-400">Loading Studio Data...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Welcome, {data?.Full_Name}</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your LMS content and track student engagement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-xl">
          <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Courses Published</p>
          <p className="text-4xl font-extrabold text-white mt-2">{data?.Total_Published || 0}</p>
        </div>
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-xl">
          <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Active Students</p>
          <p className="text-4xl font-extrabold text-purple-400 mt-2">{data?.Total_Students || 0}</p>
        </div>
      </div>

      {/* RE-STYLED HISTORY LEDGER */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-xl font-bold text-white">Course Creation History</h2>
          <Link href="/dashboard/create-course" className="text-blue-400 text-sm font-bold hover:underline">
            + Launch New Course
          </Link>
        </div>

        {data?.courses?.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700 p-12 text-center rounded-2xl text-slate-500">
            No courses found. Start building your portfolio.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data?.courses?.map((c: any) => (
              <div key={c.Course_ID} className="group bg-slate-800/60 border border-slate-700 hover:border-blue-500/50 p-5 rounded-2xl transition-all shadow-lg hover:shadow-blue-900/10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white text-lg">{c.Title}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Skill: {c.Reward_Skill}</p>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Live</span>
                </div>
                
                <div className="flex justify-between items-center bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                   <div className="text-center">
                     <p className="text-[10px] text-slate-500 uppercase font-bold">Students Finished</p>
                     <p className="text-lg font-extrabold text-emerald-400">{c.Completed_Count}</p>
                   </div>
                   
                   {/* FIXED: Restored Action Buttons */}
                   <div className="flex gap-2">
                     <Link 
                       href={`/dashboard/edit-course/${c.Course_ID}`}
                       className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all flex items-center"
                     >
                       Edit
                     </Link>
                     <button 
                      onClick={() => handleDelete(c.Course_ID)} 
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10 transition-all flex items-center"
                     >
                       Remove
                     </button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}