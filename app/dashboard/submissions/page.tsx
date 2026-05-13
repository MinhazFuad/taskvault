'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

export default function ReviewStudioPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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

      // Using the updated dashboard route to pull the complete managed list
      const res = await fetch(`/api/dashboard/corporate?id=${currentUserId}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (json.success && json.data) {
        setBounties(json.data.bounties || []);
      } else {
        setError(json.error || 'Failed to pull review ledger');
      }
    } catch (err: any) {
      setError('Network error connecting to review studio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewLedger();
  }, [router]);

  const handleApprovePayout = async (bountyId: number, amount: string) => {
    if (!userId) return;

    if (!confirm(`Confirm payout approval? This releases $${parseFloat(amount).toFixed(2)} from your escrow securely to the talent's wallet.`)) {
      return;
    }

    setActionLoading(bountyId);

    try {
      const res = await fetch('/api/bounties/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bountyId, corporateUserId: userId })
      });

      const json = await res.json();

      if (json.success) {
        alert('Work Approved! Funds released from escrow and metrics upgraded successfully.');
        await fetchReviewLedger(); // Refresh oversight queues
      } else {
        alert(json.error || 'Payout processing failed.');
      }
    } catch (err) {
      alert('Network error releasing escrow.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingReviews = bounties.filter(b => b.Status === 'Under_Review');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Corporate" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <Link href="/dashboard" className="text-blue-400 text-sm hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link>
            <h1 className="text-3xl font-bold tracking-tight">Review Studio</h1>
            <p className="text-slate-400 text-sm mt-1">Audit submitted deliverables from verified talent and authorize escrow release payouts.</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700 px-5 py-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Awaiting Sign-off</span>
            <span className="text-xl font-extrabold text-orange-400 block">{pendingReviews.length} Tasks</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center font-semibold text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 py-16 text-center animate-pulse font-medium">Scanning pending escrow deliverables...</div>
        ) : bounties.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <p className="text-lg font-semibold text-slate-400">Review queues are completely empty.</p>
            <p className="text-sm">No tasks have been claimed or submitted by talent yet. Deploy bounties to attract candidates.</p>
            <Link href="/dashboard/manage-bounties" className="text-blue-400 text-xs font-bold hover:underline block pt-2">
              Post Escrow Tasks &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. UNDER REVIEW QUEUE */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2 border-b border-slate-700 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                <span>Requires Authorization Sign-off ({pendingReviews.length})</span>
              </h2>

              {pendingReviews.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
                  No deliverables awaiting immediate authorization sign-off.
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingReviews.map(bounty => {
                    const isLoadingThis = actionLoading === bounty.Bounty_ID;

                    return (
                      <div key={bounty.Bounty_ID} className="bg-slate-800/80 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-6 shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* LEFT: CRITERIA & OVERSIGHT */}
                        <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Talent: <span className="text-slate-300">{bounty.Student_Name || 'Assigned User'}</span>
                                </span>
                                <h3 className="text-xl font-bold tracking-tight text-white">{bounty.Title}</h3>
                              </div>

                              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider shrink-0">
                                Pending Authorization
                              </span>
                            </div>

                            <div className="space-y-2">
                              <span className="text-xs text-slate-500 font-medium block">Task Expectation Requirements:</span>
                              <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-line bg-slate-900/40 p-3 rounded-lg border border-slate-800 max-h-[80px] overflow-y-auto">
                                {bounty.Description}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-700/60 text-xs text-slate-400">
                            <div><span className="text-slate-500 font-medium">Escrow Value:</span> <span className="font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></div>
                            <div>•</div>
                            <div><span className="text-slate-500 font-medium">RP Verified:</span> <span className="font-bold text-blue-400">{bounty.Required_RP} RP Threshold</span></div>
                            <div>•</div>
                            <div><span className="text-slate-500 font-medium">Deployed:</span> {new Date(bounty.Created_At).toLocaleDateString()}</div>
                          </div>
                        </div>

                        {/* RIGHT: AUDIT WORKSPACE */}
                        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
                              Lodged Proof of Work Deliverables
                            </h4>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-[140px]">
                              {bounty.Submission_Text || '[Missing Deliverables Payload]'}
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-800">
                            <button 
                              onClick={() => handleApprovePayout(bounty.Bounty_ID, bounty.Reward_Amount)}
                              disabled={isLoadingThis}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {isLoadingThis ? (
                                <span className="animate-pulse">Releasing Escrow Payout...</span>
                              ) : (
                                <span>✓ Authorize Escrow Payout</span>
                              )}
                            </button>
                            <p className="text-[9px] text-slate-500 text-center leading-tight">
                              Authorizing transfers escrow balances directly to talent wallets instantly.
                            </p>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. ACTIVE EXECUTION (ASSIGNED) */}
            <div className="space-y-4 pt-6 border-t border-slate-800">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Active Execution Queues (Talent Working)
              </h2>

              {bounties.filter(b => b.Status === 'Assigned').length === 0 ? (
                <div className="bg-slate-900/20 border border-slate-800/50 rounded-xl p-6 text-center text-slate-600 text-xs">
                  No tasks currently assigned without pending submissions.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bounties.filter(b => b.Status === 'Assigned').map(bounty => (
                    <div key={bounty.Bounty_ID} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Talent: <span className="text-slate-400">{bounty.Student_Name || 'Assigned User'}</span>
                          </span>
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Execution Active
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-white tracking-tight">{bounty.Title}</h3>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-800 text-slate-500 font-medium">
                        <div>Escrow: <span className="font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></div>
                        <div>RP Domain: <span className="text-blue-400">{bounty.Required_Skill}</span></div>
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