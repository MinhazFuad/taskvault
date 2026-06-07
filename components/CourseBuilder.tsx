'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TopNav from './TopNav';
import RichEditor, { isRichContentEmpty } from './RichEditor';

const PLATFORM_SKILLS = [
  'Angular','AWS','Azure','C#','Cybersecurity','Data Analysis','Docker','Flutter','Go',
  'Google Cloud (GCP)','GraphQL','HTML/CSS','Java','Kotlin','Kubernetes','Machine Learning',
  'MongoDB','Next.js','Node.js','NoSQL','PHP','PostgreSQL','Python','React','React Native',
  'Ruby','Rust','SQL','Swift','Tailwind CSS','Technical Writing','UI/UX Design','Vue.js',
];

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
type OptionLetter = typeof OPTION_LETTERS[number];

interface Quiz {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: OptionLetter | '';
}

interface ModuleState {
  title: string;
  content: string;
  videoUrl: string;
  quiz: Quiz | null;
}

interface CourseState {
  title: string;
  description: string;
  coverImage: string;
  imageZoom: number;
  imageX: number;
  imageY: number;
  rewardRp: number;
  rewardSkill: string;
}

interface CourseBuilderProps {
  mode: 'create' | 'edit';
  userId: number;
  courseId?: string;
  initialCourse?: CourseState;
  initialModules?: ModuleState[];
}

const DEFAULT_COURSE: CourseState = {
  title: '', description: '', coverImage: '',
  imageZoom: 0, imageX: 0, imageY: 0,
  rewardRp: 50, rewardSkill: '',
};

const BLANK_MODULE: ModuleState = { title: '', content: '', videoUrl: '', quiz: null };

const BLANK_QUIZ: Quiz = {
  question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: '',
};

function getYouTubeThumb(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname.includes('youtu.be'))    id = u.pathname.slice(1).split('?')[0];
    else if (u.hostname.includes('youtube.com')) id = u.searchParams.get('v');
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
  } catch { return null; }
}

export default function CourseBuilder({ mode, userId, courseId, initialCourse, initialModules }: CourseBuilderProps) {
  const router = useRouter();
  const [course, setCourse]   = useState<CourseState>(initialCourse ?? DEFAULT_COURSE);
  const [modules, setModules] = useState<ModuleState[]>(initialModules ?? [{ ...BLANK_MODULE }]);
  const [active, setActive]   = useState<'overview' | number>('overview');
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [showModal, setShowModal] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────

  const clearErr = (key: string) => setErrors(p => { const n = { ...p }; delete n[key]; return n; });

  const getTransform = () => {
    if (!course.imageZoom && !course.imageX && !course.imageY) return undefined;
    return `scale(${1 + course.imageZoom / 50}) translate(${course.imageX}%, ${course.imageY}%)`;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!course.title.trim())       e.title       = 'Course title is required.';
    if (!course.description.trim()) e.description = 'Description is required.';
    if (!course.rewardSkill)        e.rewardSkill = 'Select a skill domain.';
    modules.forEach((m, i) => {
      if (!m.title.trim())   e[`m${i}t`] = 'Module title required.';
      if (isRichContentEmpty(m.content)) e[`m${i}c`] = 'Module content required.';
      if (m.quiz) {
        if (!m.quiz.question.trim()) e[`m${i}qq`] = 'Quiz question required.';
        if (!m.quiz.optionA.trim() || !m.quiz.optionB.trim() || !m.quiz.optionC.trim() || !m.quiz.optionD.trim())
          e[`m${i}qo`] = 'All 4 options required.';
        if (!m.quiz.correctOption) e[`m${i}qc`] = 'Mark the correct answer.';
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const endpoint = mode === 'create' ? '/api/courses/create' : `/api/courses/${courseId}`;
      const method   = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructorId: userId, ...course, modules }),
      });
      const json = await res.json();
      if (json.success) { router.push('/dashboard'); return; }
      setErrors({ _: json.error || 'Save failed. Please try again.' });
    } catch {
      setErrors({ _: 'Network error. Check your connection and try again.' });
    } finally {
      setSaving(false);
      setShowModal(false);
    }
  };

  // ── Module ops ───────────────────────────────────────────────

  const addModule = () => {
    const idx = modules.length;
    setModules(m => [...m, { ...BLANK_MODULE }]);
    setActive(idx);
  };

  const removeModule = (i: number) => {
    if (modules.length === 1) return;
    setModules(m => m.filter((_, j) => j !== i));
    setActive(prev => (typeof prev === 'number' && prev >= i) ? Math.max(0, i - 1) : prev);
  };

  const moveModule = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= modules.length) return;
    setModules(m => { const n = [...m]; [n[i], n[j]] = [n[j], n[i]]; return n; });
    setActive(j);
  };

  const updateModule = (i: number, field: 'title' | 'content' | 'videoUrl', value: string) => {
    setModules(m => { const n = [...m]; n[i] = { ...n[i], [field]: value }; return n; });
  };

  const setModuleQuiz = (i: number, quiz: Quiz | null) => {
    setModules(m => { const n = [...m]; n[i] = { ...n[i], quiz }; return n; });
  };

  const updateModuleQuiz = (i: number, field: keyof Quiz, value: string) => {
    setModules(m => {
      const n = [...m];
      n[i] = { ...n[i], quiz: { ...(n[i].quiz ?? BLANK_QUIZ), [field]: value } };
      return n;
    });
  };

  // ── Derived ──────────────────────────────────────────────────

  const isOverview   = active === 'overview';
  const activeIdx    = typeof active === 'number' ? active : -1;
  const activeModule = activeIdx >= 0 ? modules[activeIdx] : null;
  const hasErrors    = Object.keys(errors).length > 0;

  const moduleHasErr = (i: number) =>
    !!(errors[`m${i}t`] || errors[`m${i}c`] || errors[`m${i}qq`] || errors[`m${i}qo`] || errors[`m${i}qc`]);

  const moduleErrCount = modules.reduce((acc, _, i) => acc + (moduleHasErr(i) ? 1 : 0), 0);

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-white">
      <TopNav role="Instructor" />

      {/* ── ACTION BAR ───────────────────────────────────────── */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm px-5 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors text-sm font-medium shrink-0">
          ← Back
        </Link>
        <div className="h-4 w-px bg-slate-700 shrink-0" />

        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="Untitled Course"
            value={course.title}
            onChange={e => { setCourse(p => ({ ...p, title: e.target.value })); clearErr('title'); }}
            className={`w-full bg-transparent text-base font-bold text-white placeholder-slate-600 outline-none border-b-2 pb-0.5 transition-colors ${errors.title ? 'border-red-500' : 'border-transparent focus:border-blue-500'}`}
          />
          {errors.title && <p className="text-red-400 text-[10px] mt-0.5">{errors.title}</p>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {hasErrors && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-red-400 font-semibold">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
              {Object.keys(errors).filter(k => k !== '_').length} issue{Object.keys(errors).filter(k => k !== '_').length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => { if (validate()) setShowModal(true); }}
            className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/30"
          >
            {mode === 'create' ? '🚀 Publish' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── SIDEBAR ──────────────────────────────────────── */}
        <aside className="w-64 shrink-0 border-r border-slate-700/60 bg-slate-800/30 flex flex-col overflow-y-auto">

          {/* Overview nav */}
          <button
            onClick={() => setActive('overview')}
            className={`w-full text-left px-4 py-4 border-l-2 transition-all shrink-0 ${
              isOverview
                ? 'bg-slate-700/50 border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-700/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${isOverview ? 'bg-blue-500/20' : 'bg-slate-700/60'}`}>📋</div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">Course Overview</p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">Title · Description · Cover</p>
              </div>
              {(errors.description || errors.rewardSkill) && (
                <span className="ml-auto text-red-400 text-[10px] font-bold shrink-0">!</span>
              )}
            </div>
          </button>

          {/* Curriculum header */}
          <div className="px-4 py-3 border-y border-slate-700/50 shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Curriculum</p>
              <div className="flex items-center gap-2">
                {moduleErrCount > 0 && (
                  <span className="text-[9px] text-red-400 font-bold">{moduleErrCount} error{moduleErrCount !== 1 ? 's' : ''}</span>
                )}
                <p className="text-[9px] text-slate-600">{modules.length} module{modules.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Module list */}
          <div className="flex-1 py-2 px-3 space-y-1 overflow-y-auto">
            {modules.map((m, i) => {
              const hasErr  = moduleHasErr(i);
              const isActive = active === i;
              return (
                <div key={i} className="group relative">
                  <button
                    onClick={() => setActive(i)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border ${
                      isActive
                        ? 'bg-blue-600/15 border-blue-500/30 text-blue-300'
                        : hasErr
                        ? 'border-red-500/25 text-slate-400 hover:text-white hover:bg-slate-700/30'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-14">
                      <span className={`w-5 h-5 rounded text-[9px] font-black flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-blue-500/25 text-blue-300' : 'bg-slate-700 text-slate-500'
                      }`}>{i + 1}</span>
                      <span className="truncate text-[13px] font-medium">{m.title || <span className="italic text-slate-600">Untitled module</span>}</span>
                      {hasErr && <span className="text-red-400 text-[10px] shrink-0">!</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 ml-7">
                      {m.videoUrl && <span className="text-[9px] text-slate-600">🎬 video</span>}
                      {m.quiz && <span className="text-[9px] text-purple-500">🧠 quiz</span>}
                    </div>
                  </button>

                  <div className={`absolute right-2.5 top-3 gap-0.5 ${isActive ? 'flex' : 'hidden group-hover:flex'}`}>
                    <button onClick={e => { e.stopPropagation(); moveModule(i, -1); }} disabled={i === 0}
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-white hover:bg-slate-700 disabled:opacity-20 transition-all text-[10px]">↑</button>
                    <button onClick={e => { e.stopPropagation(); moveModule(i, 1); }} disabled={i === modules.length - 1}
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-white hover:bg-slate-700 disabled:opacity-20 transition-all text-[10px]">↓</button>
                    {modules.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); removeModule(i); }}
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all text-[10px]">✕</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add module */}
          <div className="px-3 py-2 shrink-0">
            <button
              onClick={addModule}
              className="w-full border border-dashed border-slate-600/70 hover:border-blue-500/60 text-slate-500 hover:text-blue-400 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-blue-500/5 flex items-center justify-center gap-1.5"
            >
              + Add Module
            </button>
          </div>

          {/* Quick stats */}
          <div className="px-4 py-4 border-t border-slate-700/50 space-y-2 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">RP Yield</span>
              <span className="text-xs font-bold text-orange-400">+{course.rewardRp || '?'} RP</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Skill</span>
              <span className="text-xs font-bold text-blue-400 truncate max-w-[130px] text-right">{course.rewardSkill || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Quizzes</span>
              <span className="text-xs font-bold text-purple-400">{modules.filter(m => m.quiz).length}/{modules.length}</span>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-slate-900">

          {errors._ && (
            <div className="mx-8 mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between gap-3">
              <p className="text-red-400 text-sm">{errors._}</p>
              <button onClick={() => clearErr('_')} className="text-red-500 hover:text-red-300 shrink-0">✕</button>
            </div>
          )}

          {/* ── OVERVIEW PANEL ─────────────────────────────── */}
          {isOverview && (
            <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold">Course Overview</h2>
                <p className="text-slate-500 text-sm mt-1">Configure what students see when browsing the course catalog.</p>
              </div>

              {/* Cover image */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/60 flex items-center gap-3">
                  <span className="text-lg">🖼️</span>
                  <div>
                    <h3 className="font-bold text-white text-sm">Cover Image</h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">Paste any public image URL — then adjust framing</p>
                  </div>
                  <span className="ml-auto text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded font-medium">Optional</span>
                </div>
                <div className="p-6 space-y-4">
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={course.coverImage}
                    onChange={e => setCourse(p => ({ ...p, coverImage: e.target.value }))}
                    className="w-full bg-slate-900/70 border border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-blue-400 font-mono text-sm outline-none transition-all"
                  />
                  {course.coverImage && (
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-1/2 aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                        <img src={course.coverImage} alt="Cover preview" className="w-full h-full object-cover transition-transform duration-100"
                          style={getTransform() ? { transform: getTransform() } : undefined}
                          onError={e => (e.currentTarget.style.display = 'none')} />
                      </div>
                      <div className="flex-1 space-y-5 flex flex-col justify-center">
                        {([
                          { label: 'Zoom',           key: 'imageZoom' as const, min: 0,   max: 100, color: 'accent-blue-500',    fmt: (v: number) => `${v}%` },
                          { label: 'Pan Horizontal', key: 'imageX'    as const, min: -50, max: 50,  color: 'accent-purple-500',  fmt: (v: number) => `${v > 0 ? '+' : ''}${v}` },
                          { label: 'Pan Vertical',   key: 'imageY'    as const, min: -50, max: 50,  color: 'accent-emerald-500', fmt: (v: number) => `${v > 0 ? '+' : ''}${v}` },
                        ] as const).map(ctrl => (
                          <div key={ctrl.key}>
                            <div className="flex justify-between mb-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{ctrl.label}</label>
                              <span className="text-[10px] font-mono text-slate-400">{ctrl.fmt(course[ctrl.key])}</span>
                            </div>
                            <input type="range" min={ctrl.min} max={ctrl.max} step="1" value={course[ctrl.key]}
                              onChange={e => setCourse(p => ({ ...p, [ctrl.key]: parseInt(e.target.value) }))}
                              className={`${ctrl.color} w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer`} />
                          </div>
                        ))}
                        <button onClick={() => setCourse(p => ({ ...p, imageZoom: 0, imageX: 0, imageY: 0 }))}
                          className="text-[11px] text-slate-600 hover:text-slate-300 font-bold transition-colors self-start">
                          ↺ Reset framing
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📝</span>
                    <h3 className="font-bold text-white text-sm">Course Description</h3>
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono">{course.description.length} chars</span>
                </div>
                <div className="p-6">
                  <textarea rows={6}
                    placeholder={`What will students learn?\nWhat are the prerequisites?\nWho is this course for?`}
                    value={course.description}
                    onChange={e => { setCourse(p => ({ ...p, description: e.target.value })); clearErr('description'); }}
                    className={`w-full bg-slate-900/70 border rounded-xl px-4 py-3 text-slate-200 text-sm leading-relaxed resize-none outline-none transition-all hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ${errors.description ? 'border-red-500' : 'border-slate-700'}`} />
                  {errors.description && <p className="text-red-400 text-xs mt-1.5">{errors.description}</p>}
                </div>
              </div>

              {/* Reward config */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/60 flex items-center gap-3">
                  <span className="text-lg">🎯</span>
                  <div>
                    <h3 className="font-bold text-white text-sm">Completion Rewards</h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">What students earn for finishing this course</p>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Skill Domain *</label>
                      <select value={course.rewardSkill}
                        onChange={e => { setCourse(p => ({ ...p, rewardSkill: e.target.value })); clearErr('rewardSkill'); }}
                        className={`w-full bg-slate-900/70 border rounded-xl px-4 py-2.5 text-white text-sm outline-none cursor-pointer transition-all hover:border-slate-600 focus:border-blue-500 appearance-none ${errors.rewardSkill ? 'border-red-500' : 'border-slate-700'}`}>
                        <option value="" disabled>Select a skill…</option>
                        {PLATFORM_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.rewardSkill && <p className="text-red-400 text-xs mt-1.5">{errors.rewardSkill}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">RP Yield</label>
                      <div className="relative">
                        <input type="number" min="10" step="10" value={course.rewardRp}
                          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setCourse(p => ({ ...p, rewardRp: v })); }}
                          className="w-full bg-slate-900/70 border border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-white text-sm font-mono outline-none transition-all pr-12" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold pointer-events-none">RP</span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1.5">Rewarded to students on completion</p>
                    </div>
                  </div>
                  {course.rewardSkill && (
                    <div className="flex flex-wrap items-center gap-3 bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3">
                      <span className="text-xs text-slate-500">On completion, student earns:</span>
                      <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-lg capitalize">{course.rewardSkill} skill</span>
                      <span className="text-slate-600">+</span>
                      <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold px-2.5 py-1 rounded-lg">⚡ {course.rewardRp} RP</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => setActive(0)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold px-5 py-2.5 rounded-xl text-sm transition-all">
                  Edit Curriculum →
                </button>
              </div>
            </div>
          )}

          {/* ── MODULE EDITOR ──────────────────────────────── */}
          {activeModule && (
            <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                    Module {activeIdx + 1} of {modules.length}
                  </p>
                  <h2 className="text-2xl font-extrabold">
                    {activeModule.title || <span className="text-slate-600 italic">Untitled Module</span>}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => moveModule(activeIdx, -1)} disabled={activeIdx === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-white disabled:opacity-20 transition-all text-sm">↑</button>
                  <button onClick={() => moveModule(activeIdx, 1)} disabled={activeIdx === modules.length - 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-white disabled:opacity-20 transition-all text-sm">↓</button>
                  {modules.length > 1 && (
                    <button onClick={() => removeModule(activeIdx)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all text-sm">✕</button>
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/60 flex items-center gap-3">
                  <span className="text-lg">🏷️</span>
                  <h3 className="font-bold text-white text-sm">Module Title</h3>
                </div>
                <div className="p-6">
                  <input type="text" placeholder="e.g., Introduction to React Hooks"
                    value={activeModule.title}
                    onChange={e => { updateModule(activeIdx, 'title', e.target.value); clearErr(`m${activeIdx}t`); }}
                    className={`w-full bg-slate-900/70 border rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ${errors[`m${activeIdx}t`] ? 'border-red-500' : 'border-slate-700'}`} />
                  {errors[`m${activeIdx}t`] && <p className="text-red-400 text-xs mt-1.5">{errors[`m${activeIdx}t`]}</p>}
                </div>
              </div>

              {/* Video */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎬</span>
                    <div>
                      <h3 className="font-bold text-white text-sm">Video</h3>
                      <p className="text-slate-500 text-[11px] mt-0.5">YouTube links show a live thumbnail preview</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded font-medium">Optional</span>
                </div>
                <div className="p-6 space-y-4">
                  <input type="url" placeholder="https://youtu.be/..."
                    value={activeModule.videoUrl}
                    onChange={e => updateModule(activeIdx, 'videoUrl', e.target.value)}
                    className="w-full bg-slate-900/70 border border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-blue-400 font-mono text-sm outline-none transition-all" />
                  {(() => {
                    const thumb = activeModule.videoUrl ? getYouTubeThumb(activeModule.videoUrl) : null;
                    if (!thumb) return null;
                    return (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-700">
                        <img src={thumb} alt="Video thumbnail" className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-xl ring-4 ring-white/10">
                            <span className="text-white text-xl ml-1">▶</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Content */}
              <div className={`bg-slate-800/50 border rounded-2xl overflow-hidden ${errors[`m${activeIdx}c`] ? 'border-red-500/60' : 'border-slate-700'}`}>
                <div className="px-6 py-4 border-b border-slate-700/60 flex items-center gap-3">
                  <span className="text-lg">📄</span>
                  <div>
                    <h3 className="font-bold text-white text-sm">Learning Content</h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">Rich text editor · Type <kbd className="bg-slate-700 border border-slate-600 px-1 rounded text-[9px] font-mono">/</kbd> for commands</p>
                  </div>
                </div>
                <div className="p-6 bg-slate-900/40 min-h-[240px]">
                  <RichEditor
                    key={activeIdx}
                    content={activeModule.content}
                    onChange={v => { updateModule(activeIdx, 'content', v); clearErr(`m${activeIdx}c`); }}
                    placeholder="Write the instructional content for this module… Type / for formatting commands."
                    minHeight="200px"
                  />
                </div>
                {errors[`m${activeIdx}c`] && <p className="text-red-400 text-xs px-6 pb-4">{errors[`m${activeIdx}c`]}</p>}
              </div>

              {/* ── QUIZ SECTION ──────────────────────────── */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🧠</span>
                    <div>
                      <h3 className="font-bold text-white text-sm">Module Quiz</h3>
                      <p className="text-slate-500 text-[11px] mt-0.5">One MCQ question students answer after the lesson</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModuleQuiz(activeIdx, activeModule.quiz ? null : { ...BLANK_QUIZ })}
                    className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all ${
                      activeModule.quiz
                        ? 'bg-red-500/8 border-red-500/20 text-red-400 hover:bg-red-500/15'
                        : 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20'
                    }`}
                  >
                    {activeModule.quiz ? 'Remove Quiz' : '+ Add Quiz'}
                  </button>
                </div>

                {activeModule.quiz && (
                  <div className="p-6 space-y-6">
                    {/* Question */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Question *</label>
                      <textarea rows={3}
                        placeholder="e.g., What does the useEffect hook do in React?"
                        value={activeModule.quiz.question}
                        onChange={e => { updateModuleQuiz(activeIdx, 'question', e.target.value); clearErr(`m${activeIdx}qq`); }}
                        className={`w-full bg-slate-900/70 border rounded-xl px-4 py-3 text-white text-sm resize-none outline-none transition-all hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 ${errors[`m${activeIdx}qq`] ? 'border-red-500' : 'border-slate-700'}`} />
                      {errors[`m${activeIdx}qq`] && <p className="text-red-400 text-xs mt-1.5">{errors[`m${activeIdx}qq`]}</p>}
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Answer Options *</label>
                        <span className="text-[10px] text-slate-600">Click ○ to mark the correct answer</span>
                      </div>
                      {errors[`m${activeIdx}qo`] && <p className="text-red-400 text-xs">{errors[`m${activeIdx}qo`]}</p>}
                      {errors[`m${activeIdx}qc`] && <p className="text-red-400 text-xs">{errors[`m${activeIdx}qc`]}</p>}

                      {OPTION_LETTERS.map(letter => {
                        const field = `option${letter}` as keyof Quiz;
                        const isCorrect = activeModule.quiz!.correctOption === letter;
                        return (
                          <div key={letter} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            isCorrect ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-900/40 border-slate-700/60'
                          }`}>
                            <button
                              onClick={() => { updateModuleQuiz(activeIdx, 'correctOption', letter); clearErr(`m${activeIdx}qc`); }}
                              className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                isCorrect ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-emerald-400'
                              }`}
                              title="Mark as correct answer"
                            >
                              {isCorrect && <span className="text-white text-[9px] font-black">✓</span>}
                            </button>
                            <span className={`text-xs font-black w-5 shrink-0 ${isCorrect ? 'text-emerald-400' : 'text-slate-500'}`}>{letter}</span>
                            <input
                              type="text"
                              placeholder={`Option ${letter}`}
                              value={activeModule.quiz![field] as string}
                              onChange={e => { updateModuleQuiz(activeIdx, field, e.target.value); clearErr(`m${activeIdx}qo`); }}
                              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-600"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!activeModule.quiz && (
                  <div className="px-6 py-5 text-center text-slate-600 text-sm">
                    No quiz for this module. Click <span className="text-purple-400 font-semibold">+ Add Quiz</span> to include one.
                  </div>
                )}
              </div>

              {/* Prev / Next nav */}
              <div className="flex justify-between items-center pt-1">
                <button
                  onClick={() => setActive(activeIdx > 0 ? activeIdx - 1 : 'overview')}
                  className="text-slate-500 hover:text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  ← {activeIdx > 0 ? `Module ${activeIdx}` : 'Overview'}
                </button>
                {activeIdx < modules.length - 1 ? (
                  <button onClick={() => setActive(activeIdx + 1)}
                    className="text-slate-500 hover:text-white text-sm font-semibold transition-colors">
                    Module {activeIdx + 2} →
                  </button>
                ) : (
                  <button
                    onClick={() => { if (validate()) setShowModal(true); }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/30"
                  >
                    {mode === 'create' ? 'Review & Publish →' : 'Review & Save →'}
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── PUBLISH MODAL ────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm w-full shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-extrabold">
                {mode === 'create' ? '🚀 Publish course?' : '💾 Save changes?'}
              </h2>
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                {mode === 'create'
                  ? 'Your course will go live immediately and be visible to all students.'
                  : 'Changes will be applied to the live course immediately.'}
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl divide-y divide-slate-700/50">
              {[
                { label: 'Title',    value: course.title,                                       color: 'text-white' },
                { label: 'Modules',  value: `${modules.length}`,                                color: 'text-white' },
                { label: 'Quizzes',  value: `${modules.filter(m => m.quiz).length} modules`,    color: 'text-purple-400' },
                { label: 'Skill',    value: course.rewardSkill,                                 color: 'text-blue-400' },
                { label: 'RP Yield', value: `+${course.rewardRp} RP`,                           color: 'text-orange-400' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center px-4 py-2.5 text-sm">
                  <span className="text-slate-500">{row.label}</span>
                  <span className={`font-semibold truncate max-w-[180px] text-right ${row.color}`}>{row.value || '—'}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 rounded-xl text-sm transition-all">
                Keep Editing
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  : mode === 'create' ? '🚀 Publish' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
