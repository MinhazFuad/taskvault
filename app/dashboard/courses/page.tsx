'use client';

import { useState, useEffect, useMemo } from 'react';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

type Course = {
  Course_ID: number;
  Title: string;
  Description: string;
  Cover_Image: string | null;
  Image_Zoom: number;
  Image_X: number;
  Image_Y: number;
  Total_Modules: number;
  Reward_RP: number;
  Reward_Skill: string;
  Completed_Modules: number;
  Is_Completed: number;
};

type SortKey = 'newest' | 'most-rp' | 'az' | 'progress';
type FilterKey = 'all' | 'available' | 'in-progress' | 'completed';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest',    label: 'Newest'    },
  { key: 'most-rp',  label: 'Most RP'   },
  { key: 'az',       label: 'A – Z'     },
  { key: 'progress', label: 'Progress'  },
];

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',         label: 'All'         },
  { key: 'available',   label: 'Available'   },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed'   },
];

function getCourseStatus(course: Course): FilterKey {
  if (course.Is_Completed) return 'completed';
  if (course.Completed_Modules > 0) return 'in-progress';
  return 'available';
}

function getTransformStyle(course: Course): string | undefined {
  const zoom = course.Image_Zoom || 0;
  const x    = course.Image_X    || 0;
  const y    = course.Image_Y    || 0;
  if (zoom === 0 && x === 0 && y === 0) return undefined;
  return `scale(${1 + zoom / 50}) translate(${x}%, ${y}%)`;
}

export default function CoursesCatalog() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [sort, setSort]             = useState<SortKey>('newest');
  const [filter, setFilter]         = useState<FilterKey>('available');

  useEffect(() => {
    async function load() {
      try {
        const authRes  = await fetch('/api/auth/me');
        const authJson = await authRes.json();
        if (!authJson.success) { window.location.href = '/login'; return; }

        const res  = await fetch(`/api/courses?userId=${authJson.user.userId}`);
        const json = await res.json();
        if (json.success) setAllCourses(json.data);
        else setError(json.error || 'Failed to load courses');
      } catch (err: any) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => ({
    total:      allCourses.length,
    completed:  allCourses.filter(c => c.Is_Completed).length,
    inProgress: allCourses.filter(c => !c.Is_Completed && c.Completed_Modules > 0).length,
    available:  allCourses.filter(c => c.Completed_Modules === 0 && !c.Is_Completed).length,
  }), [allCourses]);

  const visible = useMemo(() => {
    let list = [...allCourses];

    // Filter by tab
    if (filter !== 'all') list = list.filter(c => getCourseStatus(c) === filter);

    // Filter by search
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(c =>
      c.Title.toLowerCase().includes(q) ||
      c.Reward_Skill.toLowerCase().includes(q) ||
      c.Description.toLowerCase().includes(q)
    );

    // Sort
    switch (sort) {
      case 'most-rp':
        list.sort((a, b) => b.Reward_RP - a.Reward_RP);
        break;
      case 'az':
        list.sort((a, b) => a.Title.localeCompare(b.Title));
        break;
      case 'progress':
        list.sort((a, b) => {
          const pctA = a.Total_Modules > 0 ? a.Completed_Modules / a.Total_Modules : 0;
          const pctB = b.Total_Modules > 0 ? b.Completed_Modules / b.Total_Modules : 0;
          return pctB - pctA;
        });
        break;
      default: // newest — server order (Course_ID desc), keep as-is
        break;
    }

    return list;
  }, [allCourses, filter, search, sort]);

  const clearFilters = () => { setSearch(''); setFilter('all'); setSort('newest'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-7">

        {/* ── PAGE HEADER ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors inline-flex items-center gap-1 mb-2">
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight">LMS Course Catalog</h1>
            <p className="text-slate-400 text-sm mt-1">
              Complete courses to earn RP and unlock bounty skills.
            </p>
          </div>

          {/* QUICK STATS */}
          {!loading && !error && (
            <div className="flex gap-3 flex-wrap shrink-0">
              {[
                { label: 'Total',       value: stats.total,      color: 'text-white'       },
                { label: 'Completed',   value: stats.completed,  color: 'text-emerald-400' },
                { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400'    },
                { label: 'Available',   value: stats.available,  color: 'text-slate-400'   },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-2 text-center min-w-[64px]">
                  <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CONTROLS ──────────────────────────────────── */}
        {!loading && !error && (
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search by title, skill, or keyword…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort buttons */}
            <div className="flex gap-1.5 flex-wrap shrink-0">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSort(opt.key)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    sort === opt.key
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTER TABS ───────────────────────────────── */}
        {!loading && !error && (
          <div className="flex gap-1 bg-slate-900/60 border border-slate-700/60 p-1 rounded-xl w-fit">
            {FILTER_TABS.map(tab => {
              const count = tab.key === 'all' ? allCourses.length
                : tab.key === 'available'   ? stats.available
                : tab.key === 'in-progress' ? stats.inProgress
                : stats.completed;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filter === tab.key
                      ? 'bg-slate-700 text-white shadow'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    filter === tab.key ? 'bg-slate-600 text-slate-200' : 'bg-slate-800 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── BODY ──────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-44 bg-slate-700/40" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-700/60 rounded w-3/4" />
                  <div className="h-3 bg-slate-700/40 rounded w-full" />
                  <div className="h-3 bg-slate-700/40 rounded w-5/6" />
                  <div className="h-2 bg-slate-700/40 rounded-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-8 text-red-400 text-center font-semibold">
            {error}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <span className="text-5xl">{search ? '🔍' : '🎓'}</span>
            <h2 className="text-lg font-bold text-white">
              {search ? `No results for "${search}"` : filter === 'completed' ? 'No completed courses yet' : 'No courses here'}
            </h2>
            <p className="text-slate-500 text-sm max-w-xs">
              {search
                ? 'Try a different keyword or clear your search.'
                : filter === 'completed'
                ? 'Finish a course to see it here.'
                : 'Adjust the filter above to see other courses.'}
            </p>
            <button onClick={clearFilters} className="mt-1 text-blue-400 hover:text-blue-300 text-sm font-bold hover:underline transition-colors">
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-600 font-medium -mt-2">
              Showing {visible.length} of {allCourses.length} courses
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map(course => {
                const pct    = course.Total_Modules > 0 ? Math.min((course.Completed_Modules / course.Total_Modules) * 100, 100) : 0;
                const status = getCourseStatus(course);
                const transform = getTransformStyle(course);

                return (
                  <Link
                    href={`/dashboard/courses/${course.Course_ID}`}
                    key={course.Course_ID}
                    className={`group flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 shadow-lg ${
                      status === 'completed'
                        ? 'bg-slate-800/40 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-900/20'
                        : status === 'in-progress'
                        ? 'bg-slate-800/60 border-blue-500/20 hover:border-blue-500/50 hover:shadow-blue-900/20'
                        : 'bg-slate-800/60 border-slate-700/50 hover:border-blue-500/40 hover:shadow-blue-900/10'
                    }`}
                  >
                    {/* COVER */}
                    <div className="relative h-44 w-full bg-slate-900 overflow-hidden border-b border-slate-700/40 shrink-0">
                      {course.Cover_Image ? (
                        <img
                          src={course.Cover_Image}
                          alt={course.Title}
                          className={`w-full h-full object-cover transition-transform duration-500 ${!transform ? 'group-hover:scale-105' : ''}`}
                          style={transform ? { transform } : undefined}
                          onError={e => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-900/40 via-slate-900/20 to-purple-900/40 flex items-center justify-center">
                          <span className="text-5xl opacity-60">📚</span>
                        </div>
                      )}

                      {/* STATUS BADGE */}
                      <div className="absolute top-3 right-3">
                        {status === 'completed' && (
                          <span className="bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg font-black shadow-lg">
                            ✓ Done
                          </span>
                        )}
                        {status === 'in-progress' && (
                          <span className="bg-blue-500/90 backdrop-blur-sm text-white text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg font-black shadow-lg">
                            In Progress
                          </span>
                        )}
                      </div>

                      {/* RP BADGE */}
                      <div className="absolute top-3 left-3">
                        <span className={`backdrop-blur-sm text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg font-black shadow-lg ${
                          status === 'completed'
                            ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/30'
                            : 'bg-blue-900/80 text-blue-300 border border-blue-500/30'
                        }`}>
                          +{course.Reward_RP} RP
                        </span>
                      </div>

                      {/* SKILL BADGE */}
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-slate-900/85 backdrop-blur-sm border border-slate-600/60 text-slate-300 text-[10px] px-2.5 py-1 rounded-lg font-bold tracking-wider uppercase shadow">
                          {course.Reward_Skill}
                        </span>
                      </div>
                    </div>

                    {/* CONTENT */}
                    <div className="p-5 flex flex-col flex-grow">
                      <h2 className={`text-base font-bold leading-snug line-clamp-1 mb-1.5 transition-colors ${
                        status === 'completed' ? 'text-emerald-300 group-hover:text-emerald-200' : 'text-white group-hover:text-blue-300'
                      }`}>
                        {course.Title}
                      </h2>
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 flex-grow mb-4">
                        {course.Description}
                      </p>

                      {/* PROGRESS */}
                      <div className="mt-auto space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>
                            {status === 'completed'
                              ? `${course.Total_Modules} / ${course.Total_Modules} modules`
                              : `${course.Completed_Modules} / ${course.Total_Modules} modules`}
                          </span>
                          <span className={pct > 0 ? (status === 'completed' ? 'text-emerald-400' : 'text-blue-400') : 'text-slate-600'}>
                            {pct > 0 ? `${Math.round(pct)}%` : 'Not started'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-900/80 rounded-full h-2 overflow-hidden border border-slate-700/40">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              status === 'completed' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className={`text-center text-xs font-bold py-2 rounded-xl mt-1 transition-all ${
                          status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : status === 'in-progress'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20'
                            : 'bg-slate-900/60 text-slate-400 border border-slate-700 group-hover:border-blue-500/30 group-hover:text-blue-300'
                        }`}>
                          {status === 'completed' ? 'Completed' : status === 'in-progress' ? 'Continue →' : 'Start Course →'}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
