'use client';
import { useState, useEffect, use } from 'react';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  const long = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (long) return `https://www.youtube.com/embed/${long[1]}`;
  return null;
}

export default function CourseViewer({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const [userId, setUserId] = useState<number | null>(null);
  const [courseData, setCourseData] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<any>(null);
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set());
  const [isMarking, setIsMarking] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [authRes, courseRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch(`/api/courses/${courseId}?t=${Date.now()}`),
        ]);
        const authJson = await authRes.json();
        const courseJson = await courseRes.json();

        if (!authJson.success || !courseJson.success) return;

        const uid = authJson.user.userId;
        setUserId(uid);
        setCourseData(courseJson);

        const progressRes = await fetch(`/api/courses?userId=${uid}`);
        const progressJson = await progressRes.json();

        let completedCount = 0;
        if (progressJson.success) {
          const found = progressJson.data.find((c: any) => c.Course_ID === parseInt(courseId));
          if (found) {
            completedCount = Math.min(found.Completed_Modules || 0, courseJson.modules.length);
            setCompletedIndices(new Set(Array.from({ length: completedCount }, (_, i) => i)));
          }
        }

        // Land on the first uncompleted module; if all done, land on the last
        const startIdx = Math.min(completedCount, courseJson.modules.length - 1);
        setActiveModule(courseJson.modules[startIdx]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  const handleMarkComplete = async () => {
    if (!userId || !activeModule || !courseData) return;
    const idx = courseData.modules.findIndex((m: any) => m.Module_ID === activeModule.Module_ID);
    if (completedIndices.has(idx)) return;

    setIsMarking(true);
    try {
      const res = await fetch('/api/courses/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: userId, courseId: parseInt(courseId) }),
      });
      const json = await res.json();
      if (json.success) {
        const next = new Set(completedIndices);
        next.add(idx);
        setCompletedIndices(next);
        if (json.courseCompleted) {
          setShowCompletion(true);
        } else {
          const nextIdx = idx + 1;
          if (nextIdx < courseData.modules.length) {
            setActiveModule(courseData.modules[nextIdx]);
          }
        }
      }
    } finally {
      setIsMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <TopNav role="Student" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400 animate-pulse font-medium">Loading course...</div>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <TopNav role="Student" />
        <div className="flex-1 flex items-center justify-center text-slate-400">Course not found.</div>
      </div>
    );
  }

  const { course, modules } = courseData;
  const activeIndex = modules.findIndex((m: any) => m.Module_ID === activeModule?.Module_ID);
  const isCurrentCompleted = completedIndices.has(activeIndex);
  const isCourseComplete = completedIndices.size >= modules.length;
  const embedUrl = activeModule?.Video_URL ? getYouTubeEmbedUrl(activeModule.Video_URL) : null;

  // A module is accessible if it has been completed OR it is the immediate next one to complete.
  // Modules beyond that are locked until prior ones are done.
  const isLocked = (i: number) => i > completedIndices.size;

  const getTransformStyle = () => {
    const zoom = course.Image_Zoom || 0;
    const x = course.Image_X || 0;
    const y = course.Image_Y || 0;
    if (zoom === 0 && x === 0 && y === 0) return undefined;
    return `scale(${1 + zoom / 50}) translate(${x}%, ${y}%)`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <TopNav role="Student" />

      {/* ── Completion Overlay ── */}
      {showCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div
            className="relative bg-slate-800 border border-slate-600/60 rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl overflow-hidden"
            style={{ animation: 'zoomIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full bg-blue-500/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.4s' }} />
            </div>
            <div className="relative">
              <div className="text-6xl mb-5" style={{ animation: 'bounce 1.5s infinite' }}>🏆</div>
              <h2 className="text-3xl font-extrabold text-white mb-1">Course Complete!</h2>
              <p className="text-slate-400 text-sm mb-7">{course.Title}</p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 mb-7">
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">Reputation Points Earned</p>
                <p className="text-5xl font-extrabold text-emerald-400">+{course.Reward_RP}</p>
                <p className="text-xs text-slate-500 mt-1.5 font-semibold">{course.Reward_Skill} skill verified</p>
              </div>
              <Link
                href="/dashboard/courses"
                className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Back to Catalog
              </Link>
              <button onClick={() => setShowCompletion(false)} className="mt-3 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Keep Reviewing
              </button>
            </div>
          </div>
          <style>{`
            @keyframes zoomIn {
              from { opacity: 0; transform: scale(0.85); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      {/* ── Hero Banner ── */}
      <div className="relative h-48 w-full bg-slate-800 overflow-hidden shrink-0">
        {course.Cover_Image ? (
          <img
            src={course.Cover_Image}
            alt={course.Title}
            className="w-full h-full object-cover opacity-35"
            style={getTransformStyle() ? { transform: getTransformStyle() } : undefined}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-blue-900/40 to-purple-900/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end px-6 pb-5">
          <Link href="/dashboard/courses" className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest mb-3 inline-flex items-center gap-1.5 w-fit transition-colors">
            ← Course Catalog
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">{course.Title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[10px] font-bold bg-slate-800/90 text-slate-300 border border-slate-600/80 px-2.5 py-1 rounded-lg">{course.Reward_Skill}</span>
            <span className="text-xs font-bold text-blue-400">+{course.Reward_RP} RP on completion</span>
            <span className="text-xs text-slate-500">{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700/60">
          <div
            className="h-full bg-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${(completedIndices.size / modules.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-6 space-y-1.5">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Curriculum</span>
            <span className={`text-xs font-bold ${isCourseComplete ? 'text-emerald-400' : 'text-slate-400'}`}>
              {completedIndices.size}/{modules.length}
            </span>
          </div>

          {modules.map((m: any, i: number) => {
            const done = completedIndices.has(i);
            const active = activeModule?.Module_ID === m.Module_ID;
            const locked = isLocked(i);

            return (
              <button
                key={m.Module_ID}
                onClick={() => !locked && setActiveModule(m)}
                disabled={locked}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 ${
                  locked
                    ? 'opacity-40 cursor-not-allowed bg-slate-800/20 border border-transparent'
                    : active
                    ? 'bg-blue-600 shadow-lg shadow-blue-900/30 cursor-pointer'
                    : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50 cursor-pointer'
                }`}
              >
                <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors border-2 ${
                  locked
                    ? 'border-slate-700 bg-slate-800/60'
                    : done
                    ? 'bg-emerald-500 border-emerald-500'
                    : active
                    ? 'border-white/70'
                    : 'border-slate-600'
                }`}>
                  {locked ? (
                    <svg className="w-2.5 h-2.5 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 10V7a5 5 0 00-10 0v3H5a1 1 0 00-1 1v10a1 1 0 001 1h14a1 1 0 001-1V11a1 1 0 00-1-1h-2zm-7-3a3 3 0 016 0v3H9V7zm3 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                    </svg>
                  ) : done ? (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={`text-[9px] font-bold leading-none ${active ? 'text-white' : 'text-slate-500'}`}>{i + 1}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate leading-snug ${
                    locked ? 'text-slate-600' : active ? 'text-white' : done ? 'text-slate-500' : 'text-slate-300'
                  }`}>
                    {m.Title}
                  </p>
                  {locked ? (
                    <p className="text-[10px] text-slate-700 mt-0.5">Complete prior module first</p>
                  ) : m.Video_URL ? (
                    <p className="text-[10px] text-slate-500 mt-0.5">▶ video</p>
                  ) : null}
                </div>
              </button>
            );
          })}

          {/* Progress card */}
          <div className="mt-5 bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overall Progress</span>
              <span className={`text-xs font-extrabold ${isCourseComplete ? 'text-emerald-400' : 'text-slate-400'}`}>
                {Math.round((completedIndices.size / modules.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${isCourseComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${(completedIndices.size / modules.length) * 100}%` }}
              />
            </div>
            {isCourseComplete && (
              <button
                onClick={() => setShowCompletion(true)}
                className="mt-3 w-full text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 py-2 rounded-lg transition-all"
              >
                🏆 View Completion
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">

            {/* Module header */}
            <div className="px-6 py-4 border-b border-slate-700/40 flex items-center gap-3.5">
              <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold transition-colors ${
                isCurrentCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {isCurrentCompleted ? '✓' : activeIndex + 1}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Module {activeIndex + 1} of {modules.length}
                </p>
                <h2 className="text-lg font-bold text-white leading-tight">{activeModule?.Title}</h2>
              </div>
            </div>

            <div className="p-6 space-y-5">

              {/* Video */}
              {embedUrl && (
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-700/60 shadow-2xl">
                  <iframe
                    key={activeModule?.Module_ID}
                    className="w-full h-full"
                    src={embedUrl}
                    title={activeModule?.Title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}

              {activeModule?.Video_URL && !embedUrl && (
                <div className="w-full aspect-video rounded-xl bg-slate-900 flex items-center justify-center border border-slate-700/60">
                  <p className="text-slate-500 text-sm">Unsupported video format</p>
                </div>
              )}

              {/* Lesson notes */}
              {activeModule?.Content && (
                <div className="bg-slate-900/50 border border-slate-700/40 rounded-xl p-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Lesson Notes</p>
                  <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">{activeModule.Content}</p>
                </div>
              )}

              {/* Nav / Mark Complete row */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 gap-3">
                <button
                  onClick={() => activeIndex > 0 && setActiveModule(modules[activeIndex - 1])}
                  disabled={activeIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors rounded-xl hover:bg-slate-700/50"
                >
                  ← Prev
                </button>

                <div className="flex-1 flex justify-center">
                  {isCourseComplete ? (
                    <button
                      onClick={() => setShowCompletion(true)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-900/30"
                    >
                      🏆 View Completion
                    </button>
                  ) : isCurrentCompleted ? (
                    <span className="text-emerald-400 text-sm font-bold flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Module Complete
                    </span>
                  ) : (
                    <button
                      onClick={handleMarkComplete}
                      disabled={isMarking}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-900/30 flex items-center gap-2"
                    >
                      {isMarking ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        '✓ Mark as Complete'
                      )}
                    </button>
                  )}
                </div>

                {/* Next is only enabled once the current module is completed */}
                <button
                  onClick={() => activeIndex < modules.length - 1 && setActiveModule(modules[activeIndex + 1])}
                  disabled={activeIndex === modules.length - 1 || !isCurrentCompleted}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors rounded-xl hover:bg-slate-700/50"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
