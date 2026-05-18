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

      const res = await fetch(`/api/dashboard/corporate?id=${currentUserId}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (json.success && json.data) {
        setBounties(json.data.bounties || []);
      } else {
        setError(json.error || 'Failed to pull review ledger');
      }
    } catch (err: any) {
      setError('Network connection processing exception connecting to audit studio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewLedger();
  }, [router]);

  const handleApprovePayout = async (bountyId: number, amount: string) => {
    if (!userId) return;

    if (!confirm(`Authorize deliverable payload sign-off? This executes permanent release of $${parseFloat(amount).toFixed(2)} from locked escrow reserves directly to talent balances.`)) {
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
        alert('Audit Complete! Escrow unlocked safely and scholar performance indices successfully upgraded.');
        await fetchReviewLedger(); 
      } else {
        alert(json.error || 'Escrow transfer transaction failed.');
      }
    } catch (err) {
      alert('Network transaction release error.');
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
            <p className="text-slate-400 text-sm mt-1">Audit multi-asset submittals lodged by talent candidates and authorize escrow fund release payouts.</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700 px-5 py-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Awaiting Validation</span>
            <span className="text-xl font-extrabold text-orange-400 block">{pendingReviews.length} Tasks</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center font-semibold text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 py-16 text-center animate-pulse font-medium">Loading execution task reporting pipelines...</div>
        ) : bounties.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <p className="text-lg font-semibold text-slate-400">Auditing queues fully resolved.</p>
            <p className="text-sm">No tasks have been assigned or submitted for auditing review. Post new tasks to fund candidates.</p>
            <Link href="/dashboard/manage-bounties" className="text-blue-400 text-xs font-bold hover:underline block pt-2">
              Deploy Task Escrows &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* UNDER REVIEW LADDER */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2 border-b border-slate-700 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                <span>Requires Client Authorization Sign-off ({pendingReviews.length})</span>
              </h2>

              {pendingReviews.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
                  No deliverables waiting for immediate operational sign-offs.
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingReviews.map(bounty => {
                    const isLoadingThis = actionLoading === bounty.Bounty_ID;

                    return (
                      <div key={bounty.Bounty_ID} className="bg-slate-800/80 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-6 shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* LEFT: OVERSIGHT REQUIREMENTS */}
                        <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Talent: <span className="text-slate-300">{bounty.Student_Name || 'Assigned Candidate'}</span>
                                </span>
                                <h3 className="text-xl font-bold tracking-tight text-white">{bounty.Title}</h3>
                              </div>

                              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider shrink-0">
                                In Processing Review
                              </span>
                            </div>

                            <div className="space-y-2">
                              <span className="text-xs text-slate-500 font-medium block">Expectation Guide:</span>
                              <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-line bg-slate-900/40 p-3 rounded-lg border border-slate-800 max-h-[80px] overflow-y-auto">
                                {bounty.Description}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-700/60 text-xs text-slate-400 font-medium">
                            <div><span className="text-slate-500">Escrow Stake:</span> <span className="font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></div>
                            <div>•</div>
                            <div><span className="text-slate-500">RP Floor:</span> <span className="text-blue-400">{bounty.Required_RP} RP Threshold</span></div>
                            <div>•</div>
                            <div><span className="text-slate-500">Deployed:</span> {new Date(bounty.Created_At).toLocaleDateString()}</div>
                          </div>
                        </div>

                        {/* RIGHT: COMPREHENSIVE MULTI-ASSET INSPECTION WORKSPACE */}
                        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
                              Lodged Deliverables Asset Analysis
                            </h4>

                            {/* TEXT NOTES SEGMENT */}
                            <div className="space-y-1">
                              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Lodged Documentation Report:</span>
                              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-[75px]">
                                {bounty.Submission_Text || '[Missing text documentation reporting]'}
                              </div>
                            </div>

                            {/* RENDER DOWNLOADABLE SECURE ATTACHMENT */}
                            <div className="space-y-1 pt-1">
                              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Asset Package Attachment:</span>
                              {bounty.Submission_File_Path ? (
                                <a 
                                  href={bounty.Submission_File_Path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={bounty.Submission_File_Name || "deliverable-attachment"}
                                  className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 p-2.5 rounded-lg text-xs text-blue-400 hover:text-blue-300 font-mono transition-all truncate block block w-full"
                                >
                                  <span className="shrink-0 text-sm">📥</span>
                                  <span className="truncate font-bold text-left">{bounty.Submission_File_Name || 'Download attachment payload'}</span>
                                </a>
                              ) : (
                                <div className="text-xs text-slate-600 font-mono bg-slate-950 p-2 rounded border border-slate-900 italic">
                                  [No external filesystem binaries attached]
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-800">
                            <button 
                              onClick={() => handleApprovePayout(bounty.Bounty_ID, bounty.Reward_Amount)}
                              disabled={isLoadingThis}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {isLoadingThis ? (
                                <span className="animate-pulse">Authorizing Asset Release...</span>
                              ) : (
                                <span>✓ Authorize Escrow Sign-off</span>
                              )}
                            </button>
                            <p className="text-[9px] text-slate-500 text-center leading-tight">
                              Authorizing releases escrow reserves permanently into mapped talent operational accounts.
                            </p>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ASSIGNED ACTIVE QUEUES */}
            <div className="space-y-4 pt-6 border-t border-slate-800">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Assigned Task Commitments (Talent Candidates Processing)
              </h2>

              {bounties.filter(b => b.Status === 'Assigned').length === 0 ? (
                <div className="bg-slate-900/20 border border-slate-800/50 rounded-xl p-6 text-center text-slate-600 text-xs">
                  No execution workflows mapped without unresolved payload deliveries.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bounties.filter(b => b.Status === 'Assigned').map(bounty => (
                    <div key={bounty.Bounty_ID} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Candidate: <span className="text-slate-400">{bounty.Student_Name || 'Assigned Candidate'}</span>
                          </span>
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Active Scope
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-white tracking-tight">{bounty.Title}</h3>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-800 text-slate-500 font-medium">
                        <div>Escrow Held: <span className="font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></div>
                        <div>RP Category: <span className="text-blue-400">{bounty.Required_Skill}</span></div>
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