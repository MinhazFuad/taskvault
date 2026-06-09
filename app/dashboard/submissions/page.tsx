'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

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
          className={`text-2xl transition-colors ${s <= (hovered || value) ? 'text-yellow-400' : 'text-slate-700 hover:text-slate-500'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent',
};

const TIER_BADGE: Record<string, string> = {
  Advanced:     'bg-purple-500/10 text-purple-400 border-purple-500/25',
  Intermediate: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  Junior:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
};

export default function ReviewStudioPage() {
  const router = useRouter();
  const [userId,        setUserId]        = useState<number | null>(null);
  const [bounties,      setBounties]      = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Hiring queue
  const [hiringQueue,     setHiringQueue]     = useState<any[]>([]);
  const [expandedBounty,  setExpandedBounty]  = useState<number | null>(null);
  const [applicants,      setApplicants]      = useState<Record<number, any[]>>({});
  const [applicantLoading,setApplicantLoading]= useState<number | null>(null);
  const [acceptLoading,   setAcceptLoading]   = useState<number | null>(null);

  const [ratingModal, setRatingModal] = useState<{
    bountyId: number; amount: string; studentName: string;
  } | null>(null);
  const [ratingValue,  setRatingValue]  = useState(0);
  const [ratingReview, setRatingReview] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const auth = await fetch('/api/auth/me').then(r => r.json());
      if (!auth.success || auth.user.role !== 'Corporate') { router.push('/dashboard'); return; }
      const uid = auth.user.userId;
      setUserId(uid);

      const [corpRes, queueRes] = await Promise.all([
        fetch(`/api/dashboard/corporate?id=${uid}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/bounties/hiring-queue?corporateUserId=${uid}`,  { cache: 'no-store' }),
      ]);

      const json = await corpRes.json();
      if (json.success) setBounties(json.data.bounties || []);
      else setError(json.error || 'Failed to load review queue');

      const queueJson = await queueRes.json();
      if (queueJson.success) setHiringQueue(queueJson.data || []);
    } catch {
      setError('Network connection error.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBounty = async (bountyId: number) => {
    if (expandedBounty === bountyId) { setExpandedBounty(null); return; }
    setExpandedBounty(bountyId);
    if (applicants[bountyId]) return; // already loaded
    if (!userId) return;
    setApplicantLoading(bountyId);
    try {
      const res  = await fetch(`/api/bounties/${bountyId}/applications?corporateUserId=${userId}`);
      const json = await res.json();
      if (json.success) setApplicants(prev => ({ ...prev, [bountyId]: json.data }));
    } catch { /* silent */ }
    finally { setApplicantLoading(null); }
  };

  const handleAccept = async (applicationId: number, bountyId: number, studentId: number) => {
    if (!userId) return;
    setAcceptLoading(applicationId);
    try {
      const res  = await fetch('/api/bounties/applications/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, bountyId, studentId, corporateUserId: userId }),
      });
      const json = await res.json();
      if (json.success) {
        setExpandedBounty(null);
        await fetchData();
      } else {
        alert(json.error || 'Failed to select candidate.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setAcceptLoading(null);
    }
  };

  useEffect(() => { fetchData(); }, [router]);

  const openRatingModal = (bounty: any) => {
    setRatingValue(0);
    setRatingReview('');
    setRatingModal({ bountyId: bounty.Bounty_ID, amount: bounty.Reward_Amount, studentName: bounty.Student_Name || 'Candidate' });
  };

  const handleApprovePayout = async () => {
    if (!userId || !ratingModal) return;
    if (ratingValue === 0) { alert('Please select a star rating before approving.'); return; }

    const modal = ratingModal;
    setActionLoading(modal.bountyId);
    setRatingModal(null);

    try {
      const res = await fetch('/api/bounties/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bountyId: modal.bountyId,
          corporateId: userId, // FIXED: Changed from corporateUserId to corporateId to match API
          corporateRating: ratingValue,
          corporateReview: ratingReview.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.success) alert(json.error || 'Payment release failed.');
      await fetchData();
    } catch {
      alert('Network error during approval.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingReviews = bounties.filter(b => b.Status === 'Under_Review');
  const inProgress     = bounties.filter(b => b.Status === 'Assigned');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <TopNav role="Corporate" />

      {/* ── Rating modal ── */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white">Rate & Approve</h3>
                <p className="text-slate-400 text-sm mt-0.5">{ratingModal.studentName}</p>
              </div>
              <button onClick={() => setRatingModal(null)} className="text-slate-500 hover:text-white text-xl leading-none">✕</button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Performance</p>
              <StarPicker value={ratingValue} onChange={setRatingValue} />
              {ratingValue > 0 && (
                <p className="text-sm font-semibold text-yellow-400">{RATING_LABELS[ratingValue]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Written Feedback <span className="text-slate-600 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Work quality, communication, professionalism…"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                value={ratingReview}
                onChange={e => setRatingReview(e.target.value)}
              />
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Releasing payment</p>
              <p className="text-2xl font-bold text-emerald-400">${parseFloat(ratingModal.amount).toFixed(2)}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">This action is permanent and cannot be undone.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRatingModal(null)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovePayout}
                disabled={ratingValue === 0}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30"
              >
                Approve & Release
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 w-full py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">← Back to Dashboard</Link>
            <h1 className="text-2xl font-bold tracking-tight mt-1">Review Studio</h1>
            <p className="text-slate-400 text-sm mt-0.5">Review submissions and release payment to approved talent.</p>
          </div>

          {/* Status summary */}
          <div className="flex gap-3 shrink-0 flex-wrap">
            <div className={`px-4 py-2.5 rounded-xl border text-center min-w-[90px] ${
              pendingReviews.length > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-slate-900 border-slate-800'
            }`}>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Needs Review</p>
              <p className={`text-2xl font-bold ${pendingReviews.length > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
                {pendingReviews.length}
              </p>
            </div>
            <div className="px-4 py-2.5 rounded-xl border bg-slate-900 border-slate-800 text-center min-w-[90px]">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">In Progress</p>
              <p className="text-2xl font-bold text-blue-400">{inProgress.length}</p>
            </div>
            {hiringQueue.length > 0 && (
              <div className="px-4 py-2.5 rounded-xl border bg-blue-500/5 border-blue-500/30 text-center min-w-[90px]">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Applications</p>
                <p className="text-2xl font-bold text-blue-400">
                  {hiringQueue.reduce((s: number, b: any) => s + parseInt(b.Application_Count), 0)}
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-slate-500 py-16 text-center animate-pulse text-sm">Loading review queue…</div>
        ) : bounties.length === 0 && hiringQueue.length === 0 ? (
          <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-14 text-center space-y-2">
            <p className="text-lg font-semibold text-slate-400">Review queue is empty.</p>
            <p className="text-slate-500 text-sm">No tasks are currently assigned or submitted.</p>
            <Link href="/dashboard/manage-bounties" className="text-blue-400 text-sm hover:underline block pt-1">Post New Bounty →</Link>
          </div>
        ) : (
          <div className="space-y-10">

            {/* ── Hiring Queue ── */}
            {hiringQueue.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-base font-bold text-blue-300 flex items-center gap-2 pb-2 border-b border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  Hiring Queue
                  <span className="text-sm font-normal text-slate-500">— select a candidate for each open bounty</span>
                </h2>

                <div className="space-y-3">
                  {hiringQueue.map((hb: any) => {
                    const isExpanded = expandedBounty === hb.Bounty_ID;
                    const isLoadingApps = applicantLoading === hb.Bounty_ID;
                    const appList = applicants[hb.Bounty_ID] || [];

                    return (
                      <div key={hb.Bounty_ID} className="bg-slate-900 border border-blue-500/20 rounded-2xl overflow-hidden">
                        {/* Bounty header — click to expand */}
                        <button
                          type="button"
                          onClick={() => toggleBounty(hb.Bounty_ID)}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg border ${TIER_BADGE[hb.Experience_Level] || ''}`}>
                              {hb.Experience_Level}
                            </span>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-white text-sm leading-snug truncate">{hb.Title}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                ${parseFloat(hb.Reward_Amount).toFixed(0)} reward · {hb.Required_Skill}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <span className="bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                              {hb.Application_Count} {parseInt(hb.Application_Count) === 1 ? 'applicant' : 'applicants'}
                            </span>
                            <svg
                              className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Applicants panel */}
                        {isExpanded && (
                          <div className="border-t border-slate-800 p-4 space-y-3 bg-slate-900/50">
                            {isLoadingApps ? (
                              <div className="text-center py-6 text-slate-500 text-sm animate-pulse">Loading applicants…</div>
                            ) : appList.length === 0 ? (
                              <div className="text-center py-6 text-slate-600 text-sm">No pending applicants.</div>
                            ) : (
                              appList.map((app: any) => {
                                const isAccepting = acceptLoading === app.Application_ID;
                                return (
                                  <div key={app.Application_ID} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
                                    {/* Applicant header row */}
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-semibold text-white">{app.Full_Name}</p>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIER_BADGE[app.Tier] || ''}`}>
                                            {app.Tier}
                                          </span>
                                        </div>
                                        {app.Headline && <p className="text-xs text-slate-400">{app.Headline}</p>}
                                      </div>

                                      {/* Stats */}
                                      <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400 flex-wrap justify-end">
                                        <span className="flex items-center gap-1">
                                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          {app.Total_Bounties_Completed} completed
                                        </span>
                                        {app.Avg_Rating ? (
                                          <span className="flex items-center gap-0.5 text-yellow-400 font-semibold">
                                            ★ {parseFloat(app.Avg_Rating).toFixed(1)}
                                            <span className="text-slate-600 font-normal">({app.Rating_Count})</span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-600 text-[10px]">No ratings yet</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Verified skills */}
                                    {app.Skills && app.Skills.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {app.Skills.map((skill: string) => (
                                          <span key={skill} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-700 border border-slate-600 text-slate-300">
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Cover letter */}
                                    {app.Cover_Letter && (
                                      <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-2.5">
                                        <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Cover Letter</p>
                                        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line line-clamp-4">{app.Cover_Letter}</p>
                                      </div>
                                    )}

                                    {/* Accept button */}
                                    <div className="flex justify-end pt-1">
                                      <button
                                        type="button"
                                        disabled={isAccepting}
                                        onClick={() => handleAccept(app.Application_ID, hb.Bounty_ID, app.Student_ID)}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-emerald-900/30"
                                      >
                                        {isAccepting
                                          ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Selecting…</>
                                          : '✓ Select this Candidate'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Needs sign-off ── */}
            <section className="space-y-4">
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 pb-2 border-b border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                Requires Sign-off
                <span className="text-sm font-normal text-slate-500">({pendingReviews.length})</span>
              </h2>

              {pendingReviews.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-6 text-center text-slate-600 text-sm">
                  No submissions waiting for your approval.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReviews.map(bounty => {
                    const isLoading = actionLoading === bounty.Bounty_ID;
                    return (
                      <div key={bounty.Bounty_ID} className="bg-slate-900 border border-orange-500/25 rounded-2xl overflow-hidden">

                        {/* Card header */}
                        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-slate-500">Talent:</span>
                              <span className="text-sm font-semibold text-slate-200">{bounty.Student_Name || 'Candidate'}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">{bounty.Title}</h3>
                          </div>
                          <span className="shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
                            Under Review
                          </span>
                        </div>

                        {/* Card body: two-column */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">

                          {/* Brief (left 3 cols) */}
                          <div className="lg:col-span-3 p-5 space-y-3">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Brief</p>
                              <p className="text-slate-400 text-sm leading-relaxed line-clamp-4 whitespace-pre-line">
                                {bounty.Description}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-2 border-t border-slate-800">
                              <span>Reward: <span className="font-bold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></span>
                              <span className="text-slate-700">·</span>
                              <span>RP floor: <span className="text-blue-400">{bounty.Required_RP} RP</span></span>
                              <span className="text-slate-700">·</span>
                              <span>Posted: {new Date(bounty.Created_At).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>

                          {/* Deliverables + action (right 2 cols) */}
                          <div className="lg:col-span-2 p-5 flex flex-col gap-4 bg-slate-900/50">
                            <div className="space-y-3 flex-1">
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Submission</p>

                              {/* Written submission */}
                              <div>
                                <p className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider mb-1">Documentation</p>
                                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono max-h-[80px] overflow-y-auto whitespace-pre-wrap">
                                  {bounty.Submission_Text || <span className="text-slate-600 italic">[No text provided]</span>}
                                </div>
                              </div>

                              {/* File attachment */}
                              <div>
                                <p className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider mb-1">Attachment</p>
                                {bounty.Submission_File_Path ? (
                                  <a
                                    href={bounty.Submission_File_Path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={bounty.Submission_File_Name || 'attachment'}
                                    className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 p-2.5 rounded-lg text-xs text-blue-400 font-mono transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="truncate font-semibold">{bounty.Submission_File_Name || 'Download file'}</span>
                                  </a>
                                ) : (
                                  <div className="text-xs text-slate-600 italic bg-slate-950 border border-slate-800 p-2.5 rounded-lg">[No file attached]</div>
                                )}
                              </div>
                            </div>

                            {/* Approve button */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-800">
                              <button
                                onClick={() => openRatingModal(bounty)}
                                disabled={isLoading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {isLoading ? (
                                  <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Processing…
                                  </>
                                ) : (
                                  '★ Approve & Release Payment'
                                )}
                              </button>
                              <p className="text-[9px] text-slate-600 text-center">You will rate the talent before funds are released.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── In progress (monitoring) ── */}
            <section className="space-y-4">
              <h2 className="text-base font-bold text-slate-500 flex items-center gap-2 pb-2 border-b border-slate-800 uppercase tracking-wider text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                Active — Talent Working
                <span className="font-normal normal-case tracking-normal text-slate-600">({inProgress.length})</span>
              </h2>

              {inProgress.length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-6 text-center text-slate-600 text-sm">
                  No tasks currently in progress.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inProgress.map(bounty => (
                    <div key={bounty.Bounty_ID} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-700 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">
                            Talent: <span className="text-slate-400">{bounty.Student_Name || 'Assigned'}</span>
                          </p>
                          <h3 className="font-semibold text-slate-200 leading-snug">{bounty.Title}</h3>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          In Progress
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span>
                          <span className="text-slate-700">·</span>
                          <span>{bounty.Required_Skill}</span>
                        </div>
                        <span className="text-slate-600">
                          Due {new Date(bounty.Due_Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </main>
    </div>
  );
}