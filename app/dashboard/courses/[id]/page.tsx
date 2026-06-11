'use client';
import { useState, useEffect, useRef, use } from 'react';
import TopNav from '@/components/TopNav';
import RichEditor from '@/components/RichEditor';
import Link from 'next/link';

// FIXED YOUTUBE PARSER
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  if (url.includes('youtube.com/embed/')) return url;
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  const long = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (long) return `https://www.youtube.com/embed/${long[1]}`;
  return null;
}

export default function CourseViewer({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const [userId, setUserId]           = useState<number | null>(null);
  const [courseData, setCourseData]   = useState<any>(null);
  const [activeModule, setActiveModule] = useState<any>(null);
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set());
  const [isMarking, setIsMarking]     = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [loading, setLoading]         = useState(true);

  const [quizSelected, setQuizSelected]   = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [notesOpen, setNotesOpen]         = useState(false);
  const [notes, setNotes]                 = useState<Record<number, string>>({});
  const [noteSaveStatus, setNoteSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [authRes, courseRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch(`/api/courses/${courseId}?t=${Date.now()}`),
        ]);
        const authJson   = await authRes.json();
        const courseJson = await courseRes.json();
        if (!authJson.success || !courseJson.success) return;

        const uid = authJson.user.userId;
        setUserId(uid);
        setCourseData(courseJson);

        const progressRes  = await fetch(`/api/courses?userId=${uid}`);
        const progressJson = await progressRes.json();

        let completedCount = 0;
        if (progressJson.success) {
          const found = progressJson.data.find((c: any) => c.Course_ID === parseInt(courseId));
          if (found) {
            completedCount = Math.min(found.Completed_Modules || 0, courseJson.modules.length);
            setCompletedIndices(new Set(Array.from({ length: completedCount }, (_, i) => i)));
          }
        }
        const startIdx = Math.min(completedCount, courseJson.modules.length - 1);
        setActiveModule(courseJson.modules[startIdx]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  useEffect(() => {
    if (!activeModule || !userId) return;
    setQuizSelected(null);
    setQuizSubmitted(false);
    setNoteSaveStatus('idle');

    const mid = activeModule.Module_ID;
    if (notes[mid] !== undefined) return;

    fetch(`/api/courses/notes?studentId=${userId}&moduleId=${mid}`)
      .then(r => r.json())
      .then(j => { if (j.success) setNotes(prev => ({ ...prev, [mid]: j.content ?? '' })); })
      .catch(() => {});
  }, [activeModule?.Module_ID, userId]);

  const handleNoteChange = (json: string) => {
    const mid = activeModule?.Module_ID;
    if (!mid || !userId) return;
    setNotes(prev => ({ ...prev, [mid]: json }));
    setNoteSaveStatus('idle');
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(async () => {
      setNoteSaveStatus('saving');
      try {
        await fetch('/api/courses/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: userId, moduleId: mid, content: json }),
        });
        setNoteSaveStatus('saved');
      } catch {
        setNoteSaveStatus('idle');
      }
    }, 1500);
  };

  const handleMarkComplete = async () => {
    if (!userId || !activeModule || !courseData) return;
    const idx = courseData.modules.findIndex((m: any) => m.Module_ID === activeModule.Module_ID);
    if (completedIndices.has(idx)) return;
    setIsMarking(true);
    try {
      const res  = await fetch('/api/courses/progress', {
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
          if (nextIdx < courseData.modules.length) setActiveModule(courseData.modules[nextIdx]);
        }
      }
    } finally {
      setIsMarking(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <TopNav role="Student" />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse font-medium">Loading course...</div>
      </div>
    </div>
  );

  if (!courseData) return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <TopNav role="Student" />
      <div className="flex-1 flex items-center justify-center text-slate-400">Course not found.</div>
    </div>
  );

  const { course, modules }   = courseData;
  const activeIndex           = modules.findIndex((m: any) => m.Module_ID === activeModule?.Module_ID);
  const isCurrentCompleted    = completedIndices.has(activeIndex);
  const isCourseComplete      = completedIndices.size >= modules.length;
  const embedUrl              = activeModule?.Video_URL ? getYouTubeEmbedUrl(activeModule.Video_URL) : null;
  const activeNotes           = activeModule ? (notes[activeModule.Module_ID] ?? '') : '';
  const quiz                  = activeModule?.quiz ?? null;

  const isLocked = (i: number) => i > completedIndices.size;

  const getTransformStyle = () => {
    const zoom = course.Image_Zoom || 0, x = course.Image_X || 0, y = course.Image_Y || 0;
    if (!zoom && !x && !y) return undefined;
    return `scale(${1 + zoom / 50}) translate(${x}%, ${y}%)`;
  };

  const quizOptionText = (letter: string) => {
    if (!quiz) return '';
    const map: Record<string, string> = { A: quiz.optionA, B: quiz.optionB, C: quiz.optionC, D: quiz.optionD };
    return map[letter] ?? '';
  };

  const isQuizCorrect = quizSubmitted && quizSelected === quiz?.correctOption;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <TopNav role="Student" />

      {showCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="relative bg-slate-800 border border-slate-600/60 rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl overflow-hidden"
            style={{ animation: 'zoomIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full bg-blue-500/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.4s' }} />
            </div>
            <div className="relative">
              <div className="flex justify-center mb-5" style={{ animation: 'bounce 1.5s infinite' }}><svg className="w-16 h-16 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg></div>
              <h2 className="text-3xl font-extrabold text-white mb-1">Course Complete!</h2>
              <p className="text-slate-400 text-sm mb-7">{course.Title}</p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 mb-7">
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">Reputation Points Earned</p>
                <p className="text-5xl font-extrabold text-emerald-400">+{course.Reward_RP}</p>
                <p className="text-xs text-slate-500 mt-1.5 font-semibold">{course.Reward_Skill} skill verified</p>
              </div>
              <Link href="/dashboard/courses" className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors text-sm">Back to Catalog</Link>
              <button onClick={() => setShowCompletion(false)} className="mt-3 text-slate-500 hover:text-slate-300 text-sm transition-colors">Keep Reviewing</button>
            </div>
          </div>
          <style>{`@keyframes zoomIn { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }`}</style>
        </div>
      )}

      {notesOpen && (
        <div className="fixed inset-0 z-[59] bg-black/50 sm:hidden" onClick={() => setNotesOpen(false)} />
      )}

      <div className={`fixed inset-y-0 right-0 z-[60] w-full sm:w-[420px] bg-slate-900 border-l border-slate-700/60 flex flex-col shadow-2xl shadow-black/40 transition-transform duration-300 ease-in-out ${notesOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-700/60 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500/15 border border-amber-500/25 rounded-lg flex items-center justify-center"><svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></div>
            <div>
              <p className="text-sm font-bold text-white">My Notes</p>
              {activeModule && <p className="text-[10px] text-slate-500 mt-0.5 max-w-[220px] truncate">{activeModule.Title}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {noteSaveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-2.5 h-2.5 border border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                Saving
              </span>
            )}
            {noteSaveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>Saved</span>
            )}
            <button onClick={() => setNotesOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 h-full">
            {activeModule ? (
              <RichEditor
                key={activeModule.Module_ID}
                content={activeNotes}
                onChange={handleNoteChange}
                placeholder={`Take notes for "${activeModule.Title}"… Type / for formatting commands.`}
                autoFocus
                minHeight="300px"
              />
            ) : (
              <p className="text-slate-600 text-sm">Select a module to start taking notes.</p>
            )}
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-slate-700/60 bg-slate-900">
          <p className="text-[10px] text-slate-600">Notes auto-save per module · Rich text supported · Type <kbd className="bg-slate-800 border border-slate-700 px-1 py-0.5 rounded text-[9px] font-mono">/</kbd> for commands</p>
        </div>
      </div>

      <div className="relative h-48 w-full bg-slate-800 overflow-hidden shrink-0">
        {course.Cover_Image
          ? <img src={course.Cover_Image} alt={course.Title} className="w-full h-full object-cover opacity-35" style={getTransformStyle() ? { transform: getTransformStyle() } : undefined} onError={(e) => { e.currentTarget.src = 'https://placehold.co/1200x400/1e293b/94a3b8?text=Image+Unavailable'; e.currentTarget.style.transform = 'none'; }} />
          : <div className="w-full h-full bg-gradient-to-tr from-blue-900/40 to-purple-900/30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end px-6 pb-5">
          <Link href="/dashboard/courses" className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest mb-3 inline-flex items-center gap-1.5 w-fit transition-colors">← Course Catalog</Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">{course.Title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[10px] font-bold bg-slate-800/90 text-slate-300 border border-slate-600/80 px-2.5 py-1 rounded-lg">{course.Reward_Skill}</span>
            <span className="text-xs font-bold text-blue-400">+{course.Reward_RP} RP on completion</span>
            <span className="text-xs text-slate-500">{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700/60">
          <div className="h-full bg-emerald-500 transition-all duration-700 ease-out" style={{ width: `${(completedIndices.size / modules.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        <aside className="lg:sticky lg:top-6 space-y-1.5">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Curriculum</span>
            <span className={`text-xs font-bold ${isCourseComplete ? 'text-emerald-400' : 'text-slate-400'}`}>
              {completedIndices.size}/{modules.length}
            </span>
          </div>

          {modules.map((m: any, i: number) => {
            const done   = completedIndices.has(i);
            const active = activeModule?.Module_ID === m.Module_ID;
            const locked = isLocked(i);
            return (
              <button key={m.Module_ID} onClick={() => !locked && setActiveModule(m)} disabled={locked}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 ${
                  locked ? 'opacity-40 cursor-not-allowed bg-slate-800/20' :
                  active ? 'bg-blue-600 shadow-lg shadow-blue-900/30' :
                  'bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-600/50'
                }`}>
                <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                  locked ? 'border-slate-700 bg-slate-800/60' :
                  done  ? 'bg-emerald-500 border-emerald-500' :
                  active ? 'border-white/70' : 'border-slate-600'
                }`}>
                  {locked ? (
                    <svg className="w-2.5 h-2.5 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 10V7a5 5 0 00-10 0v3H5a1 1 0 00-1 1v10a1 1 0 001 1h14a1 1 0 001-1V11a1 1 0 00-1-1h-2zm-7-3a3 3 0 016 0v3H9V7zm3 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                    </svg>
                  ) : done ? (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <span className={`text-[9px] font-bold ${active ? 'text-white' : 'text-slate-500'}`}>{i + 1}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${locked ? 'text-slate-600' : active ? 'text-white' : done ? 'text-slate-500' : 'text-slate-300'}`}>{m.Title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {locked && <p className="text-[10px] text-slate-700">Complete prior first</p>}
                    {!locked && m.Video_URL && <span className="text-[10px] text-slate-500">▶ video</span>}
                    {!locked && m.quiz && <span className="flex items-center gap-0.5 text-[10px] text-purple-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> quiz</span>}
                  </div>
                </div>
              </button>
            );
          })}

          <div className="mt-5 bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</span>
              <span className={`text-xs font-extrabold ${isCourseComplete ? 'text-emerald-400' : 'text-slate-400'}`}>
                {Math.round((completedIndices.size / modules.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${isCourseComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${(completedIndices.size / modules.length) * 100}%` }} />
            </div>
            {isCourseComplete && (
              <button onClick={() => setShowCompletion(true)}
                className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 py-2 rounded-lg transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                View Completion
              </button>
            )}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-3.5">
              <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold ${isCurrentCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {isCurrentCompleted ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg> : activeIndex + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Module {activeIndex + 1} of {modules.length}</p>
                <h2 className="text-lg font-bold text-white leading-tight truncate">{activeModule?.Title}</h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {quiz && <span className="flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-lg"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> Quiz</span>}
                <button
                  onClick={() => setNotesOpen(o => !o)}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    notesOpen
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'bg-slate-700/60 border-slate-600/60 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/8'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  Notes
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">

              {embedUrl && (
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-700/60 shadow-2xl">
                  <iframe key={activeModule?.Module_ID} className="w-full h-full" src={embedUrl} title={activeModule?.Title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                </div>
              )}
              {activeModule?.Video_URL && !embedUrl && (
                <div className="w-full aspect-video rounded-xl bg-slate-900 flex items-center justify-center border border-slate-700/60 p-4 text-center">
                  <p className="text-slate-500 text-sm">Unsupported video format. The instructor provided a link that cannot be automatically embedded.</p>
                </div>
              )}

              {activeModule?.Content && (
                <div className="bg-slate-900/50 border border-slate-700/40 rounded-xl p-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Lesson Content</p>
                  <RichEditor
                    key={`content-${activeModule.Module_ID}`}
                    content={activeModule.Content}
                    readOnly
                  />
                </div>
              )}

              {quiz && (
                <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-purple-500/15 flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                    <div>
                      <p className="text-xs font-bold text-purple-300">Knowledge Check</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Test your understanding before moving on</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-white font-semibold text-sm leading-relaxed">{quiz.question}</p>
                    <div className="space-y-2.5">
                      {(['A', 'B', 'C', 'D'] as const).map(letter => {
                        const text      = quizOptionText(letter);
                        const selected  = quizSelected === letter;
                        const isCorrect = letter === quiz.correctOption;
                        let cls = 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:bg-slate-700/30';
                        if (quizSubmitted) {
                          if (isCorrect)     cls = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300';
                          else if (selected) cls = 'border-red-500/50 bg-red-500/10 text-red-300';
                          else               cls = 'border-slate-700/40 bg-slate-800/20 text-slate-500';
                        } else if (selected) cls = 'border-purple-500/60 bg-purple-500/10 text-purple-200';
                        return (
                          <button key={letter} disabled={quizSubmitted} onClick={() => setQuizSelected(letter)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ${cls} ${quizSubmitted ? 'cursor-default' : 'cursor-pointer'}`}>
                            <span className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black border ${
                              quizSubmitted && isCorrect ? 'bg-emerald-500 border-emerald-400 text-white' :
                              quizSubmitted && selected && !isCorrect ? 'bg-red-500/30 border-red-400 text-red-200' :
                              selected ? 'bg-purple-500/25 border-purple-400 text-purple-200' :
                              'bg-slate-700 border-slate-600 text-slate-400'
                            }`}>{letter}</span>
                            <span className="flex-1">{text}</span>
                            {quizSubmitted && isCorrect && <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>}
                            {quizSubmitted && selected && !isCorrect && <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>}
                          </button>
                        );
                      })}
                    </div>
                    {!quizSubmitted ? (
                      <button onClick={() => { if (quizSelected) setQuizSubmitted(true); }} disabled={!quizSelected}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all">
                        Submit Answer
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isQuizCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                          <span className="shrink-0">
                            {isQuizCorrect
                              ? <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                              : <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                            }
                          </span>
                          <div>
                            <p className="font-bold text-sm">{isQuizCorrect ? 'Correct!' : 'Not quite.'}</p>
                            {!isQuizCorrect && <p className="text-xs mt-0.5 opacity-80">Correct answer: <strong>{quiz.correctOption}</strong> — {quizOptionText(quiz.correctOption)}</p>}
                          </div>
                        </div>
                        <button onClick={() => { setQuizSelected(null); setQuizSubmitted(false); }}
                          className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-sm transition-all">
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 gap-3">
                <button onClick={() => activeIndex > 0 && setActiveModule(modules[activeIndex - 1])} disabled={activeIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors rounded-xl hover:bg-slate-700/50">
                  ← Prev
                </button>
                <div className="flex-1 flex justify-center">
                  {isCourseComplete ? (
                    <button onClick={() => setShowCompletion(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-900/30"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg> View Completion</button>
                  ) : isCurrentCompleted ? (
                    <span className="text-emerald-400 text-sm font-bold flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Module Complete
                    </span>
                  ) : (
                    <button onClick={handleMarkComplete} disabled={isMarking || (quiz && (!quizSubmitted || !isQuizCorrect))}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-900/30 flex items-center gap-2">
                      {isMarking ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg> Mark as Complete</>}
                    </button>
                  )}
                </div>
                <button onClick={() => activeIndex < modules.length - 1 && setActiveModule(modules[activeIndex + 1])}
                  disabled={activeIndex === modules.length - 1 || !isCurrentCompleted}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors rounded-xl hover:bg-slate-700/50">
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