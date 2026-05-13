'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

export default function MyBountiesStudioPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Submission form states
  const [submissionTexts, setSubmissionTexts] = useState<{ [key: number]: string }>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const fetchClaimedTasks = async () => {
    try {
      setLoading(true);
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();

      if (!authJson.success || authJson.user.role !== 'Student') {
        router.push('/dashboard');
        return;
      }

      const currentUserId = authJson.user.userId;
      setUserId(currentUserId);

      // Using the updated dashboard route to pull their complete list
      const res = await fetch(`/api/dashboard/student?id=${currentUserId}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (json.success && json.data) {
        setBounties(json.data.bounties || []);
      } else {
        setError(json.error || 'Failed to pull claimed tasks');
      }
    } catch (err: any) {
      setError('Network error connecting to execution terminal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimedTasks();
  }, [router]);

  const handleTextChange = (bountyId: number, text: string) => {
    setSubmissionTexts({
      ...submissionTexts,
      [bountyId]: text
    });
  };

  const handleSubmitDeliverables = async (bountyId: number) => {
    if (!userId) return;
    const text = submissionTexts[bountyId];

    if (!text || text.trim() === '') {
      alert('Please provide a project link, repository URL, or text deliverables before lodging.');
      return;
    }

    setSubmittingId(bountyId);

    try {
      const res = await fetch('/api/bounties/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bountyId,
          studentId: userId,
          submissionText: text
        })
      });

      const json = await res.json();

      if (json.success) {
        alert('Deliverables successfully lodged! The company has been notified for escrow review.');
        // Clear text field and reload list
        setSubmissionTexts({ ...submissionTexts, [bountyId]: '' });
        await fetchClaimedTasks();
      } else {
        alert(json.error || 'Submission failed.');
      }
    } catch (err) {
      alert('Network error lodging deliverables.');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div>
          <Link href="/dashboard" className="text-blue-400 text-sm hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link>
          <h1 className="text-3xl font-bold tracking-tight">Execution Studio</h1>
          <p className="text-slate-400 text-sm mt-1">Manage claimed task escrows, lodge deliverables, and track review status.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center font-semibold text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 py-16 text-center animate-pulse font-medium">Scanning execution terminal...</div>
        ) : bounties.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <p className="text-lg font-semibold text-slate-400">Your execution queue is completely clear.</p>
            <p className="text-sm">You do not have any active claimed tasks to submit deliverables for.</p>
            <Link href="/dashboard/bounties" className="text-blue-400 text-xs font-bold hover:underline block pt-2">
              Find Bounties to Claim &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {bounties.map(bounty => {
              const isAssigned = bounty.Status === 'Assigned';
              const isUnderReview = bounty.Status === 'Under_Review';
              const isCompleted = bounty.Status === 'Completed';
              const isLoadingThis = submittingId === bounty.Bounty_ID;

              return (
                <div key={bounty.Bounty_ID} className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* LEFT: CRITERIA & METADATA */}
                  <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            {bounty.Company_Name}
                          </span>
                          <h2 className="text-xl font-bold tracking-tight text-white">{bounty.Title}</h2>
                        </div>

                        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider shrink-0 ${
                          isAssigned ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          isUnderReview ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {bounty.Status.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        {bounty.Description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-700/60 text-xs text-slate-400 font-medium">
                      <div><span className="text-slate-500">Escrow Value:</span> <span className="font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></div>
                      <div>•</div>
                      <div><span className="text-slate-500">RP Locked:</span> <span className="font-bold text-blue-400">{bounty.Required_RP} RP</span></div>
                      <div>•</div>
                      <div><span className="text-slate-500">Skill Domain:</span> {bounty.Required_Skill}</div>
                      <div>•</div>
                      <div><span className="text-slate-500">Claimed:</span> {new Date(bounty.Created_At).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* RIGHT: SUBMISSION TERMINAL */}
                  <div className="lg:col-span-1 bg-slate-900/80 border border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 mb-3">
                        Deliverables Workspace
                      </h3>

                      {isAssigned ? (
                        <div className="space-y-3">
                          <label className="block text-xs text-slate-400 font-medium">Lodge Repository Link / Proof of Work:</label>
                          <textarea 
                            rows={5} placeholder="https://github.com/...&#10;&#10;Explain deliverables lodged above..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-500 resize-none font-mono"
                            value={submissionTexts[bounty.Bounty_ID] || ''}
                            onChange={(e) => handleTextChange(bounty.Bounty_ID, e.target.value)}
                            disabled={isLoadingThis}
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <span className="block text-xs text-slate-500 font-medium">Lodged Submission Text:</span>
                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-[120px]">
                            {bounty.Submission_Text || '[No deliverables lodged]'}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      {isAssigned && (
                        <button 
                          onClick={() => handleSubmitDeliverables(bounty.Bounty_ID)}
                          disabled={isLoadingThis}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                          {isLoadingThis ? 'Lodging Deliverables...' : 'Lodge & Request Review &rarr;'}
                        </button>
                      )}

                      {isUnderReview && (
                        <div className="w-full bg-slate-800 border border-orange-500/20 text-orange-400 text-xs font-semibold py-2.5 rounded-lg text-center">
                          ⏳ Escrow Under Corporate Review
                        </div>
                      )}

                      {isCompleted && (
                        <div className="w-full bg-slate-800 border border-emerald-500/20 text-emerald-400 text-xs font-bold py-2.5 rounded-lg text-center flex items-center justify-center gap-1.5">
                          <span>✓ Funds Released to Wallet</span>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}