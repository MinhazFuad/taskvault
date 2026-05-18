'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InstructorDashboard({ userId }: { userId: number }) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch(`/api/dashboard/instructor?id=${userId}&t=${Date.now()}`, {
          cache: 'no-store'
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Database response error.");
        }

        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to fetch instructor metrics");

        setDashboardData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [userId]);

  if (loading) return <div className="p-6 text-slate-400 text-center text-xl animate-pulse font-medium">Accessing Studio Data...</div>;
  if (error) return <div className="p-6 text-red-400 text-center font-bold">Error: {error}</div>;

  const metrics = dashboardData;
  const courses = dashboardData?.courses || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, Instructor {metrics?.Full_Name}</h1>
        <Link 
          href="/dashboard/create-course" 
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all text-sm"
        >
          + Create New Course
        </Link>
      </div>

      {/* OVERVIEW METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Courses Published</h3>
          <p className="text-4xl font-extrabold text-blue-400 mt-2">{metrics?.Total_Published || 0}</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Students</h3>
          <p className="text-4xl font-extrabold text-purple-400 mt-2">{metrics?.Total_Students || 0}</p>
          <p className="text-[10px] text-slate-500 mt-1">Unique learners engaging with your modules</p>
        </div>
      </div>

      {/* COURSE CREATION HISTORY LEDGER */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Course Creation History</h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
            {courses.length} Modules Online
          </span>
        </div>

        {courses.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl space-y-2">
            <p className="font-semibold text-slate-400">Your teaching ledger is currently empty.</p>
            <p className="text-sm">Build and publish your first verified course to begin accumulating students.</p>
            <Link href="/dashboard/create-course" className="text-blue-400 text-xs font-bold hover:underline block pt-2">
              Launch Course Builder &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course: any) => (
              <div key={course.Course_ID} className="bg-slate-900/80 border border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-600 transition-all">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Course ID: #{course.Course_ID}
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                      Live
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white tracking-tight">{course.Title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{course.Description}</p>
                </div>

                <div className="flex justify-between items-center bg-slate-800/40 p-3 rounded-lg border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Yield</span>
                    <span className="font-extrabold text-blue-400">+{course.Reward_RP} RP</span>
                  </div>
                  <div className="text-center border-l border-r border-slate-700 px-4">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Length</span>
                    <span className="font-bold text-slate-300">{course.Total_Modules} Modules</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Domain</span>
                    <span className="font-bold text-purple-400">{course.Reward_Skill}</span>
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