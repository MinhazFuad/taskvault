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
          className={`text-3xl transition-colors ${s <= (hovered || value) ? 'text-yellow-400' : 'text-slate-600'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

export default function ReviewStudioPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Rating modal state
  const [ratingModal, setRatingModal] = useState<{ bountyId: number; amount: string; studentName: string } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingReview, setRatingReview] = useState('');

  const fetchReviewLedger = async () => {
    try {
      setLoading(true);
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();

      if (!authJson.success || authJson.user.role !== 'Corporate') {
        router.push('/dashboard');
        return;
      }

      const currentUserId = authJson.user.userId;
      setUserId(currentUserId);

      const res = await fetch(`/api/dashboard/corporate?id=${currentUserId}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (json.success && json.data) {
        setBounties(json.data.bounties || []);
      } else {
        setError(json.error || 'Failed to pull review ledger');
      }
    } catch (err: any) {
      setError('Network connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviewLedger(); }, [router]);

  const openRatingModal = (bounty: any) => {
    setRatingValue(0);
    setRatingReview('');
    setRatingModal({ bountyId: bounty.Bounty_ID, amount: bounty.Reward_Amount, studentName: bounty.Student_Name || 'Candidate' });
  };

  const handleApprovePayout = async () => {
    if (!userId || !ratingModal) return;

    if (ratingValue === 0) {
      alert('Please select a star rating before approving.');
      return;
    }

    setActionLoading(ratingModal.bountyId);
    setRatingModal(null);

    try {
      const res = await fetch('/api/bounties/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bountyId: ratingModal.bountyId,
          corporateUserId: userId,
          corporateRating: ratingValue,
          corporateReview: ratingReview.trim() || null,
        }),
      });

      const json = await res.json();

      if (json.success) {
        await fetchReviewLedger();
      } else {
        alert(json.error || 'Escrow transfer failed.');
      }
    } catch (err) {
      alert('Network error during approval.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingReviews = bounties.filter(b => b.Status === 'Under_Review');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Corporate" />

      {/* ── Rating modal ── */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white">Rate this Talent</h3>
                <p className="text-slate-400 text-sm mt-0.5">{ratingModal.studentName}</p>
              </div>
              <button onClick={() => setRatingModal(null)} className="text-slate-500 hover:text-white text-xl leading-none">✕</button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Performance</p>
              <StarPicker value={ratingValue} onChange={setRatingValue} />
              {ratingValue > 0 && (
                <p className="text-sm font-semibold text-yellow-400">{RATING_LABELS[ratingValue]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Written Feedback (Optional)</label>
              <textarea
                rows={3}
                placeholder="Describe the quality of deliverables, communication, and professionalism..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                value={ratingReview}
                onChange={e => setRatingReview(e.target.value)}
              />
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Releasing escrow</p>
              <p className="text-2xl font-extrabold text-emerald-400">${parseFloat(ratingModal.amount).toFixed(2)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">This action is permanent and cannot be undone.</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRatingModal(null)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprovePayout}
                disabled={ratingValue === 0}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30"
              >
                ✓ Approve & Release
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <Link href="/dashboard" className="text-blue-400 text-sm hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link>
            <h1 className="text-3xl font-bold tracking-tight">Review Studio</h1>
            <p className="text-slate-400 text-sm mt-1">Audit submissions and release escrow. Your rating is saved with each approval.</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700 px-5 py-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Awaiting Validation</span>
            <span className="text-xl font-extrabold text-orange-400 block">{pendingReviews.length} Tasks</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center font-semibold text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-slate-400 py-16 text-center animate-pulse font-medium">Loading review queue...</div>
        ) : bounties.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <p className="text-lg font-semibold text-slate-400">Review queue is empty.</p>
            <p className="text-sm">No tasks have been submitted for review.</p>
            <Link href="/dashboard/manage-bounties" className="text-blue-400 text-xs font-bold hover:underline block pt-2">
              Post New Bounties &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-8">

            {/* UNDER REVIEW */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2 border-b border-slate-700 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                Requires Sign-off ({pendingReviews.length})
              </h2>

              {pendingReviews.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
                  No deliverables waiting for sign-off.
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingReviews.map(bounty => {
                    const isLoadingThis = actionLoading === bounty.Bounty_ID;

                    return (
                      <div key={bounty.Bounty_ID} className="bg-slate-800/80 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-6 shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* LEFT */}
                        <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Talent: <span className="text-slate-300">{bounty.Student_Name || 'Candidate'}</span>
                                </span>
                                <h3 className="text-xl font-bold tracking-tight text-white">{bounty.Title}</h3>
                              </div>
                              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider shrink-0">
                                Under Review
                              </span>
                            </div>

                            <div className="space-y-2">
                              <span className="text-xs text-slate-500 font-medium block">Brief:</span>
                              <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-line bg-slate-900/40 p-3 rounded-lg border border-slate-800 max-h-[80px] overflow-y-auto">
                                {bounty.Description}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-700/60 text-xs text-slate-400 font-medium">
                            <div><span className="text-slate-500">Escrow:</span> <span className="font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></div>
                            <div>•</div>
                            <div><span className="text-slate-500">RP Floor:</span> <span className="text-blue-400">{bounty.Required_RP} RP</span></div>
                            <div>•</div>
                            <div><span className="text-slate-500">Posted:</span> {new Date(bounty.Created_At).toLocaleDateString()}</div>
                          </div>
                        </div>

                        {/* RIGHT: deliverables + approve */}
                        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
                              Deliverables
                            </h4>

                            <div className="space-y-1">
                              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Documentation:</span>
                              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-[75px]">
                                {bounty.Submission_Text || '[No text provided]'}
                              </div>
                            </div>

                            <div className="space-y-1 pt-1">
                              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Attachment:</span>
                              {bounty.Submission_File_Path ? (
                                <a
                                  href={bounty.Submission_File_Path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={bounty.Submission_File_Name || 'deliverable'}
                                  className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 p-2.5 rounded-lg text-xs text-blue-400 font-mono transition-all w-full"
                                >
                                  <span className="shrink-0">📥</span>
                                  <span className="truncate font-bold">{bounty.Submission_File_Name || 'Download'}</span>
                                </a>
                              ) : (
                                <div className="text-xs text-slate-600 font-mono bg-slate-950 p-2 rounded border border-slate-900 italic">[No file attached]</div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-800">
                            <button
                              onClick={() => openRatingModal(bounty)}
                              disabled={isLoadingThis}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {isLoadingThis ? (
                                <span className="animate-pulse">Processing...</span>
                              ) : (
                                <span>★ Rate & Approve Payout</span>
                              )}
                            </button>
                            <p className="text-[9px] text-slate-500 text-center">You will rate the talent before releasing escrow.</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ASSIGNED (monitoring) */}
            <div className="space-y-4 pt-6 border-t border-slate-800">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Active Commitments — Talent Working
              </h2>

              {bounties.filter(b => b.Status === 'Assigned').length === 0 ? (
                <div className="bg-slate-900/20 border border-slate-800/50 rounded-xl p-6 text-center text-slate-600 text-xs">
                  No tasks currently in progress.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bounties.filter(b => b.Status === 'Assigned').map(bounty => (
                    <div key={bounty.Bounty_ID} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Candidate: <span className="text-slate-400">{bounty.Student_Name || 'Assigned'}</span>
                          </span>
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                            In Progress
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-white tracking-tight">{bounty.Title}</h3>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-800 text-slate-500 font-medium">
                        <div>Escrow: <span className="font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></div>
                        <div>Skill: <span className="text-blue-400">{bounty.Required_Skill}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
