'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

const RATING_LABELS: Record<number, string> = {
  1: 'Poor', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent',
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className={`transition-colors ${s <= (hovered || value) ? 'text-yellow-400' : 'text-slate-700 hover:text-slate-500'}`}
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
        </button>
      ))}
    </div>
  );
}

type FormEntry = { text: string; file: File | null; rating: number; review: string };

export default function ExecutionStudioPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const [forms, setForms] = useState<Record<number, FormEntry>>({});

  const patchForm = (id: number, patch: Partial<FormEntry>) => {
    setForms(prev => {
      const current: FormEntry = prev[id] ?? { text: '', file: null, rating: 0, review: '' };
      return { ...prev, [id]: { ...current, ...patch } };
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const authRes  = await fetch('/api/auth/me');
      const authJson = await authRes.json();
      if (!authJson.success || authJson.user.role !== 'Student') { router.push('/dashboard'); return; }

      const uid = authJson.user.userId;
      setUserId(uid);

      fetch('/api/bounties/process-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: uid }),
      }).catch(() => {});

      const [dashRes, appsRes] = await Promise.all([
        fetch(`/api/dashboard/student?id=${uid}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/bounties/apply?studentId=${uid}`, { cache: 'no-store' }),
      ]);

      const dashJson = await dashRes.json();
      if (dashJson.success && dashJson.data) {
        setBounties(dashJson.data.bounties || []);
        const cd = dashJson.data.Cooldown_Until ? new Date(dashJson.data.Cooldown_Until) : null;
        setCooldownUntil(cd && cd > new Date() ? cd : null);
      } else {
        setError(dashJson.error || 'Failed to load your tasks');
      }

      const appsJson = await appsRes.json();
      if (appsJson.success) setApplications(appsJson.data || []);
    } catch {
      setError('Network error connecting to Execution Studio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, bountyId: number) => {
    e.preventDefault();
    if (!userId) return;

    const form = forms[bountyId] || { text: '', file: null, rating: 0, review: '' };

    if (!form.rating || form.rating < 1) {
      alert('Please rate this client before submitting your work.');
      return;
    }

    const text = form.text.trim();
    if (!text && !form.file) {
      alert('Please add your notes or attach a file before submitting.');
      return;
    }

    if (!confirm('Submit your work and client rating? This cannot be undone.')) return;

    setSubmittingId(bountyId);
    try {
      const fd = new FormData();
      fd.append('bountyId', bountyId.toString());
      fd.append('studentId', userId.toString());
      fd.append('submissionText', text);
      fd.append('studentRating', form.rating.toString());
      fd.append('studentReview', form.review.trim());
      if (form.file) fd.append('file', form.file);

      const res  = await fetch('/api/bounties/submit', { method: 'POST', body: fd });
      const json = await res.json();

      if (json.success) {
        await fetchData();
      } else {
        alert(json.error || 'Submission failed. Please try again.');
      }
    } catch {
      alert('A network error occurred while uploading.');
    } finally {
      setSubmittingId(null);
    }
  };

  const activeTasks    = bounties.filter(b => b.Status === 'Assigned');
  const pendingReviews = bounties.filter(b => b.Status === 'Under_Review');
  const completedCount = bounties.filter(b => b.Status === 'Completed').length;

  const cooldownDaysLeft = cooldownUntil
    ? Math.ceil((cooldownUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 w-full py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">← Dashboard</Link>
            <h1 className="text-2xl font-bold tracking-tight mt-1">Execution Studio</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage active tasks, submit deliverables, and track your applications.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex gap-2">
              <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center min-w-[56px]">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Active</p>
                <p className="text-lg font-bold text-blue-400">{activeTasks.length}</p>
              </div>
              <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center min-w-[56px]">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Review</p>
                <p className="text-lg font-bold text-orange-400">{pendingReviews.length}</p>
              </div>
              <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center min-w-[56px]">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Applied</p>
                <p className="text-lg font-bold text-violet-400">{applications.length}</p>
              </div>
            </div>

            <Link
              href="/dashboard/my-history"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              History
              {completedCount > 0 && (
                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-bold">{completedCount}</span>
              )}
            </Link>
          </div>
        </div>

        {/* ── Cooldown banner ── */}
        {cooldownUntil && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-5 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            <div>
              <p className="font-bold text-red-400">Account on Penalty Cooldown</p>
              <p className="text-red-300/70 text-sm mt-0.5">
                A bounty deadline was missed. New applications are blocked for{' '}
                <strong>{cooldownDaysLeft} more {cooldownDaysLeft === 1 ? 'day' : 'days'}</strong>{' '}
                until {cooldownUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
                Your RP was reduced by 15%.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-medium">{error}</div>
        )}

        {loading ? (
          <div className="text-slate-500 py-20 text-center animate-pulse">Loading your workspace…</div>
        ) : (
          <div className="space-y-10">

            {/* ── ACTIVE TASKS ── */}
            <section className="space-y-5">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <h2 className="text-base font-bold text-slate-200">Active Tasks</h2>
                <span className="text-sm text-slate-600">({activeTasks.length})</span>
              </div>

              {activeTasks.length === 0 ? (
                <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-14 text-center space-y-2">
                  <p className="text-slate-400 font-semibold">No active tasks</p>
                  <p className="text-slate-600 text-sm">Apply to bounties from the board to get started.</p>
                  <Link href="/dashboard/bounties" className="text-blue-400 text-sm font-bold hover:underline block pt-2">Browse Bounty Board →</Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeTasks.map(bounty => {
                    const form = forms[bounty.Bounty_ID] || { text: '', file: null, rating: 0, review: '' };
                    const isSubmitting = submittingId === bounty.Bounty_ID;
                    const daysLeft  = Math.ceil((new Date(bounty.Due_Date).getTime() - Date.now()) / (1000 * 3600 * 24));
                    const isOverdue = daysLeft < 0;
                    const isUrgent  = daysLeft <= 2 && !isOverdue;

                    return (
                      <div key={bounty.Bounty_ID} className="bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">

                        {/* ── Brief header ── */}
                        <div className="px-6 py-5 border-b border-slate-800">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{bounty.Company_Name}</p>
                              <h3 className="text-xl font-bold text-white leading-snug">{bounty.Title}</h3>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(0)}</p>
                              <p className={`text-xs font-bold mt-0.5 ${isOverdue ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-slate-500'}`}>
                                {isOverdue ? <span className="inline-flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>Overdue</span> : `${daysLeft}d remaining`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                              {bounty.Experience_Level}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                              {bounty.Required_Skill}
                            </span>
                            <span className="text-slate-600 text-[10px] ml-auto">
                              Due {new Date(bounty.Due_Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {/* ── Description + repo ── */}
                        <div className="px-6 py-4 border-b border-slate-800/50 space-y-3">
                          <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto">
                            {bounty.Description}
                          </p>
                          {bounty.Repo_Link && (
                            <a
                              href={bounty.Repo_Link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              View Project Repo / Assets
                            </a>
                          )}
                        </div>

                        <form onSubmit={e => handleSubmit(e, bounty.Bounty_ID)} className="divide-y divide-slate-800/50">

                          {/* ── Step 1: Rate client ── */}
                          <div className="px-6 py-5 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                              <p className="text-sm font-bold text-white">Rate this client</p>
                              <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Required</span>
                            </div>
                            <p className="text-slate-500 text-xs pl-7">How was the brief clarity, communication, and overall working experience?</p>

                            <div className="pl-7 space-y-2">
                              <StarPicker value={form.rating} onChange={v => patchForm(bounty.Bounty_ID, { rating: v })} />
                              {form.rating > 0 && (
                                <p className="text-yellow-400 text-xs font-semibold">{RATING_LABELS[form.rating]}</p>
                              )}
                              <textarea
                                rows={2}
                                placeholder="Optional: describe brief quality, communication, payment terms, or anything helpful for other talent…"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-yellow-500/40 resize-none placeholder:text-slate-600"
                                value={form.review}
                                onChange={e => patchForm(bounty.Bounty_ID, { review: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* ── Step 2: Submit work ── */}
                          <div className="px-6 py-5 space-y-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full border text-[10px] font-black flex items-center justify-center shrink-0 transition-colors ${form.rating > 0 ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>2</span>
                              <p className={`text-sm font-bold transition-colors ${form.rating > 0 ? 'text-white' : 'text-slate-600'}`}>Submit your deliverables</p>
                            </div>

                            <div className="pl-7 space-y-3">
                              <textarea
                                rows={4}
                                placeholder="Provide notes, deployment URLs, repository links, or proof of completion…"
                                disabled={form.rating === 0}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 resize-none placeholder:text-slate-600 disabled:opacity-35 disabled:cursor-not-allowed"
                                value={form.text}
                                onChange={e => patchForm(bounty.Bounty_ID, { text: e.target.value })}
                              />

                              <input
                                type="file"
                                disabled={form.rating === 0}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-400 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                onChange={e => patchForm(bounty.Bounty_ID, { file: e.target.files?.[0] || null })}
                              />

                              <button
                                type="submit"
                                disabled={isSubmitting || form.rating === 0}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                              >
                                {isSubmitting ? (
                                  <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Uploading…
                                  </>
                                ) : form.rating === 0 ? (
                                  'Rate the client first to unlock submission'
                                ) : (
                                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>Submit Work for Review</>
                                )}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── AWAITING CLIENT APPROVAL ── */}
            {pendingReviews.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                  <h2 className="text-base font-bold text-slate-200">Awaiting Client Approval</h2>
                  <span className="text-sm text-slate-600">({pendingReviews.length})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pendingReviews.map(bounty => (
                    <div key={bounty.Bounty_ID} className="bg-slate-900 border border-orange-500/20 rounded-2xl p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{bounty.Company_Name}</p>
                          <h3 className="font-bold text-slate-200 leading-snug mt-0.5">{bounty.Title}</h3>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse">
                          Under Review
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
                        <span>Reward: <span className="font-bold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></span>
                        <span>
                          Submitted {bounty.Submitted_At
                            ? new Date(bounty.Submitted_At).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── YOUR APPLICATIONS ── */}
            {applications.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
                  <h2 className="text-base font-bold text-slate-200">Your Applications</h2>
                  <span className="text-sm text-slate-600">({applications.length})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {applications.map((app: any) => {
                    const isAccepted = app.Status === 'Accepted';
                    const isRejected = app.Status === 'Rejected';
                    return (
                      <div
                        key={app.Application_ID}
                        className={`rounded-xl border p-4 space-y-2.5 ${
                          isAccepted ? 'bg-emerald-500/5 border-emerald-500/25'
                          : isRejected ? 'bg-slate-900/50 border-slate-800/60 opacity-55'
                          : 'bg-slate-900 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{app.Company_Name}</p>
                            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-1 mt-0.5">{app.Title}</h3>
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isAccepted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isRejected ? 'bg-slate-700/40 text-slate-500 border-slate-700'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {isAccepted ? <span className="inline-flex items-center gap-1">Accepted <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span> : isRejected ? 'Not Selected' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-emerald-400">${parseFloat(app.Reward_Amount).toFixed(0)}</span>
                          <span className="text-slate-600">
                            {new Date(app.Applied_At).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Empty state ── */}
            {!loading && activeTasks.length === 0 && pendingReviews.length === 0 && applications.length === 0 && (
              <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-16 text-center space-y-3">
                <svg className="w-12 h-12 text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <p className="text-slate-400 font-semibold">Your studio is empty</p>
                <p className="text-slate-600 text-sm">Browse the bounty board and apply to projects that match your skills.</p>
                <Link href="/dashboard/bounties" className="text-blue-400 text-sm font-bold hover:underline block pt-1">Browse Bounty Board →</Link>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
