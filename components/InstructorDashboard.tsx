'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SkeletonCard() {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5 animate-pulse space-y-4">
      <div className="flex justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-slate-700/60 rounded w-1/4" />
          <div className="h-5 bg-slate-700/60 rounded w-3/4" />
        </div>
        <div className="h-7 w-16 bg-slate-700/40 rounded-lg shrink-0" />
      </div>
      <div className="h-3 bg-slate-700/30 rounded w-full" />
      <div className="h-3 bg-slate-700/30 rounded w-2/3" />
      <div className="h-2 bg-slate-700/40 rounded-full" />
      <div className="flex gap-2 justify-end">
        <div className="h-8 w-16 bg-slate-700/40 rounded-lg" />
        <div className="h-8 w-16 bg-slate-700/40 rounded-lg" />
      </div>
    </div>
  );
}

export default function InstructorDashboard({ userId }: { userId: number }) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const res  = await fetch(`/api/dashboard/instructor?id=${userId}&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [userId]);

  const handleDelete = async (courseId: number) => {
    if (!confirm('Are you sure? This will remove the course and all student progress.')) return;
    setDeleting(courseId);
    await fetch('/api/courses/delete', {
      method: 'POST',
      body: JSON.stringify({ courseId, instructorId: userId }),
      headers: { 'Content-Type': 'application/json' },
    });
    await fetchData();
    setDeleting(null);
  };

  const courses        = data?.courses || [];
  const totalPublished = parseInt(data?.Total_Published)  || 0;
  const totalStudents  = parseInt(data?.Total_Students)   || 0;
  const totalComplete  = parseInt(data?.Total_Completions)|| 0;
  const totalRp        = parseInt(data?.Total_RP_Awarded) || 0;

  const STATS = [
    {
      label:  'Courses Published',
      value:  totalPublished,
      color:  'text-white',
      accent: 'bg-blue-500/10 border-blue-500/20',
      icon:   '📚',
    },
    {
      label:  'Students Enrolled',
      value:  totalStudents,
      color:  'text-purple-400',
      accent: 'bg-purple-500/10 border-purple-500/20',
      icon:   '👥',
    },
    {
      label:  'Total Completions',
      value:  totalComplete,
      color:  'text-emerald-400',
      accent: 'bg-emerald-500/10 border-emerald-500/20',
      icon:   '🏅',
    },
    {
      label:  'RP Awarded',
      value:  totalRp.toLocaleString(),
      color:  'text-orange-400',
      accent: 'bg-orange-500/10 border-orange-500/20',
      icon:   '⚡',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── HERO HEADER ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-slate-400 text-sm font-medium">{getGreeting()},</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">
            {loading ? (
              <span className="inline-block h-9 w-48 bg-slate-700/50 rounded-lg animate-pulse align-middle" />
            ) : (
              data?.Full_Name || 'Instructor'
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your courses and track how students are progressing.
          </p>
        </div>

        <Link
          href="/dashboard/create-course"
          className="shrink-0 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2"
        >
          <span className="text-base">+</span> New Course
        </Link>
      </div>

      {/* ── STATS ROW ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(stat => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-5 space-y-2 ${stat.accent} ${loading ? 'animate-pulse' : ''}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{stat.label}</p>
              <span className="text-lg">{stat.icon}</span>
            </div>
            {loading ? (
              <div className="h-9 bg-slate-700/40 rounded-lg w-2/3" />
            ) : (
              <p className={`text-4xl font-extrabold ${stat.color} leading-none`}>{stat.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── COURSES SECTION ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Your Courses</h2>
            {!loading && totalPublished > 0 && (
              <p className="text-slate-500 text-xs mt-0.5">{totalPublished} published course{totalPublished !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-14 text-center space-y-4">
            <span className="text-5xl block">📝</span>
            <div>
              <p className="text-lg font-bold text-white">No courses yet</p>
              <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                Create your first course to start teaching students and awarding skills.
              </p>
            </div>
            <Link
              href="/dashboard/create-course"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/30"
            >
              + Create Your First Course
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {courses.map((c: any) => {
              const completed   = parseInt(c.Completed_Count)   || 0;
              const inProgress  = parseInt(c.In_Progress_Count) || 0;
              const totalEnroll = completed + inProgress;
              const pct         = totalEnroll > 0 ? Math.round((completed / totalEnroll) * 100) : 0;
              const isDeleting  = deleting === c.Course_ID;

              return (
                <div
                  key={c.Course_ID}
                  className="flex flex-col bg-slate-800/70 border border-slate-700 hover:border-slate-600 rounded-2xl transition-all shadow-lg hover:shadow-blue-900/10 group"
                >
                  {/* CARD HEADER */}
                  <div className="p-5 pb-4 space-y-3">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                        Live
                      </span>
                      <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded capitalize">
                        Skill: {c.Reward_Skill}
                      </span>
                      <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-bold px-2 py-0.5 rounded">
                        ⚡ {c.Reward_RP} RP
                      </span>
                      <span className="bg-slate-900/60 border border-slate-700 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded ml-auto">
                        {c.Total_Modules} module{c.Total_Modules !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-white leading-snug group-hover:text-blue-300 transition-colors">
                      {c.Title}
                    </h3>

                    {/* Description */}
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                      {c.Description}
                    </p>
                  </div>

                  {/* ENGAGEMENT PANEL */}
                  <div className="mx-5 mb-5 mt-auto space-y-3 bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                    {/* Counts */}
                    <div className="grid grid-cols-3 divide-x divide-slate-700/60">
                      <div className="text-center pr-4">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Enrolled</p>
                        <p className="text-xl font-extrabold text-white mt-0.5">{totalEnroll}</p>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">In Progress</p>
                        <p className="text-xl font-extrabold text-yellow-400 mt-0.5">{inProgress}</p>
                      </div>
                      <div className="text-center pl-4">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Completed</p>
                        <p className="text-xl font-extrabold text-emerald-400 mt-0.5">{completed}</p>
                      </div>
                    </div>

                    {/* Completion bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Completion Rate</p>
                        <p className="text-[10px] font-black text-slate-400">{pct}%</p>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Link
                        href={`/dashboard/edit-course/${c.Course_ID}`}
                        className="flex-1 text-center text-xs font-bold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 px-3 py-2 rounded-lg transition-all"
                      >
                        Edit Course
                      </Link>
                      <button
                        onClick={() => handleDelete(c.Course_ID)}
                        disabled={isDeleting}
                        className="flex-1 text-xs font-bold text-red-400 hover:text-white bg-red-500/5 hover:bg-red-600/80 border border-red-500/15 hover:border-red-500/50 px-3 py-2 rounded-lg transition-all disabled:opacity-40"
                      >
                        {isDeleting ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
