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
          className={`text-2xl transition-colors ${s <= (hovered || value) ? 'text-yellow-400' : 'text-slate-600'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ExecutionStudioPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);

  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [formInputs, setFormInputs] = useState<{ [key: number]: { text: string; file: File | null } }>({});

  const [ratingInputs, setRatingInputs] = useState<{ [k: number]: { value: number; review: string } }>({});
  const [ratingLoading, setRatingLoading] = useState<number | null>(null);

  const fetchMyBounties = async () => {
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

      // Process any missed deadlines silently
      fetch('/api/bounties/process-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: currentUserId }),
      }).catch(() => {});

      const res = await fetch(`/api/dashboard/student?id=${currentUserId}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (json.success && json.data) {
        setBounties(json.data.bounties || []);
        const cd = json.data.Cooldown_Until ? new Date(json.data.Cooldown_Until) : null;
        setCooldownUntil(cd && cd > new Date() ? cd : null);
      } else {
        setError(json.error || 'Failed to load your tasks');
      }
    } catch {
      setError('Network error connecting to Execution Studio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyBounties(); }, [router]);

  const handleTextChange = (bountyId: number, text: string) => {
    setFormInputs(prev => ({ ...prev, [bountyId]: { ...prev[bountyId], text, file: prev[bountyId]?.file || null } }));
  };

  const handleFileChange = (bountyId: number, file: File | null) => {
    setFormInputs(prev => ({ ...prev, [bountyId]: { ...prev[bountyId], text: prev[bountyId]?.text || '', file } }));
  };

  const handleSubmitDeliverables = async (e: React.FormEvent, bountyId: number) => {
    e.preventDefault();
    if (!userId) return;

    const inputs = formInputs[bountyId];
    const text = inputs?.text?.trim() || '';
    const file = inputs?.file;

    if (!text && !file) {
      alert('Please add your notes or attach a file before submitting.');
      return;
    }

    if (!confirm('Ready to submit? Once sent, the client will begin reviewing your work.')) return;

    setSubmittingId(bountyId);

    try {
      const formData = new FormData();
      formData.append('bountyId', bountyId.toString());
      formData.append('studentId', userId.toString());
      formData.append('submissionText', text);
      if (file) formData.append('file', file);

      const res = await fetch('/api/bounties/submit', { method: 'POST', body: formData });
      const json = await res.json();

      if (json.success) {
        alert('Submitted successfully! Awaiting client review.');
        await fetchMyBounties();
      } else {
        alert(json.error || 'Failed to submit. Please try again.');
      }
    } catch {
      alert('A network error occurred while uploading assets.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRateCorporate = async (bountyId: number) => {
    if (!userId) return;
    const { value, review } = ratingInputs[bountyId] || {};
    if (!value || value < 1) {
      alert('Please select a star rating before submitting.');
      return;
    }

    setRatingLoading(bountyId);
    try {
      const res = await fetch('/api/bounties/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bountyId, studentId: userId, rating: value, review: review?.trim() || null }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchMyBounties();
      } else {
        alert(json.error || 'Failed to submit rating.');
      }
    } catch {
      alert('Network error submitting rating.');
    } finally {
      setRatingLoading(null);
    }
  };

  const activeTasks = bounties.filter(b => b.Status === 'Assigned');
  const pendingReviews = bounties.filter(b => b.Status === 'Under_Review');
  const completedUnrated = bounties.filter(b => b.Status === 'Completed' && !b.Student_Rating);
  const completedRated = bounties.filter(b => b.Status === 'Completed' && b.Student_Rating);

  const cooldownDaysLeft = cooldownUntil
    ? Math.ceil((cooldownUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <Link href="/dashboard" className="text-blue-400 text-sm hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link>
            <h1 className="text-3xl font-bold tracking-tight">Execution Studio</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your active tasks and submit your completed work.</p>
          </div>
        </div>

        {/* COOLDOWN BANNER */}
        {cooldownUntil && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-red-400 text-xl mt-0.5 shrink-0">⛔</span>
            <div>
              <p className="font-bold text-red-400">Account on Penalty Cooldown</p>
              <p className="text-red-300/70 text-sm mt-0.5">
                A bounty deadline was missed. New bounty claims are blocked for{' '}
                <strong>{cooldownDaysLeft} more {cooldownDaysLeft === 1 ? 'day' : 'days'}</strong>{' '}
                until {cooldownUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
                Your RP was reduced by 15%.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center font-semibold text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-slate-400 py-16 text-center animate-pulse font-medium">Booting execution environment...</div>
        ) : (
          <div className="space-y-12">

            {/* ACTIVE TASKS */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                Action Required ({activeTasks.length})
              </h2>

              {activeTasks.length === 0 ? (
                <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500 space-y-2">
                  <p className="text-lg font-semibold text-slate-400">Your execution queue is clear.</p>
                  <p className="text-sm">Claim a bounty on the Bounty Board to begin a new task.</p>
                  <Link href="/dashboard/bounties" className="text-blue-400 text-xs font-bold hover:underline block pt-2">
                    Browse Bounty Board &rarr;
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {activeTasks.map(bounty => {
                    const isSubmitting = submittingId === bounty.Bounty_ID;
                    const daysUntilDue = Math.ceil((new Date(bounty.Due_Date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

                    return (
                      <div key={bounty.Bounty_ID} className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                        <div className="p-6 border-b border-slate-700 bg-slate-900/40">
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <div>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">{bounty.Company_Name}</span>
                              <h3 className="text-xl font-bold tracking-tight text-white">{bounty.Title}</h3>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Reward</span>
                              <span className="text-lg font-extrabold text-emerald-400 block">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span>
                            </div>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-900/60 p-4 rounded-xl border border-slate-800 max-h-[150px] overflow-y-auto">
                            {bounty.Description}
                          </p>
                          <div className="mt-4 flex justify-between items-center text-xs font-medium">
                            <div>
                              <span className="text-slate-500">Tier Limit: </span>
                              <span className="text-blue-400">{bounty.Experience_Level}</span>
                            </div>
                            <div className={`font-bold ${daysUntilDue <= 2 ? 'text-red-400' : 'text-orange-400'}`}>
                              Due in: {daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}
                            </div>
                          </div>
                        </div>

                        <form onSubmit={(e) => handleSubmitDeliverables(e, bounty.Bounty_ID)} className="p-6 space-y-5 flex-grow flex flex-col justify-end bg-slate-800/60">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Written Documentation / Links</label>
                            <textarea
                              rows={3}
                              placeholder="Provide execution notes, links to repositories, or written proofs..."
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none text-sm"
                              value={formInputs[bounty.Bounty_ID]?.text || ''}
                              onChange={(e) => handleTextChange(bounty.Bounty_ID, e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Attach Asset File (Optional)</label>
                            <input
                              type="file"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-400 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer"
                              onChange={(e) => handleFileChange(bounty.Bounty_ID, e.target.files ? e.target.files[0] : null)}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-auto flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? (
                              <span className="animate-pulse">Uploading Assets to Secure Vault...</span>
                            ) : (
                              <span>🚀 Submit Your Work</span>
                            )}
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* AWAITING REVIEW */}
            {pendingReviews.length > 0 && (
              <section className="space-y-4 pt-8 border-t border-slate-800">
                <h2 className="text-xl font-bold text-slate-400 pb-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                  Awaiting Client Approval ({pendingReviews.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingReviews.map(bounty => (
                    <div key={bounty.Bounty_ID} className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{bounty.Company_Name}</span>
                          <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Under Review
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-300 tracking-tight">{bounty.Title}</h3>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-800 text-slate-500 font-medium">
                        <div>Reward: <span className="font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></div>
                        <div>Submitted: <span className="text-slate-400">{bounty.Submitted_At ? new Date(bounty.Submitted_At).toLocaleDateString() : 'N/A'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* RATE YOUR CLIENT */}
            {completedUnrated.length > 0 && (
              <section className="space-y-4 pt-8 border-t border-slate-800">
                <h2 className="text-xl font-bold text-yellow-400/90 pb-2 flex items-center gap-2">
                  <span className="text-yellow-400">★</span>
                  Rate Your Client ({completedUnrated.length})
                </h2>
                <p className="text-slate-400 text-sm -mt-2">Share your experience working with these clients to help other talent make informed decisions.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {completedUnrated.map(bounty => {
                    const isSubmittingRating = ratingLoading === bounty.Bounty_ID;
                    const thisRating = ratingInputs[bounty.Bounty_ID] || { value: 0, review: '' };

                    return (
                      <div key={bounty.Bounty_ID} className="bg-slate-900/80 border border-yellow-500/20 rounded-2xl p-6 space-y-5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{bounty.Company_Name}</span>
                            <h3 className="font-bold text-base text-white tracking-tight">{bounty.Title}</h3>
                          </div>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Completed
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Rating</p>
                          <StarPicker
                            value={thisRating.value}
                            onChange={v => setRatingInputs(prev => ({ ...prev, [bounty.Bounty_ID]: { ...prev[bounty.Bounty_ID], value: v, review: prev[bounty.Bounty_ID]?.review || '' } }))}
                          />
                          {thisRating.value > 0 && (
                            <p className="text-xs text-yellow-400 font-semibold">
                              {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][thisRating.value]}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Written Feedback (Optional)</label>
                          <textarea
                            rows={2}
                            placeholder="Describe communication quality, brief clarity, payment promptness..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-yellow-500/50 resize-none"
                            value={thisRating.review}
                            onChange={e => setRatingInputs(prev => ({ ...prev, [bounty.Bounty_ID]: { ...prev[bounty.Bounty_ID], value: prev[bounty.Bounty_ID]?.value || 0, review: e.target.value } }))}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRateCorporate(bounty.Bounty_ID)}
                          disabled={isSubmittingRating || thisRating.value === 0}
                          className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isSubmittingRating ? 'Submitting...' : '★ Submit Client Review'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* COMPLETED & RATED */}
            {completedRated.length > 0 && (
              <section className="space-y-3 pt-8 border-t border-slate-800">
                <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Completed &amp; Reviewed</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedRated.map(bounty => (
                    <div key={bounty.Bounty_ID} className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-600 block font-bold uppercase">{bounty.Company_Name}</span>
                        <h3 className="text-sm font-semibold text-slate-500">{bounty.Title}</h3>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex gap-0.5 justify-end">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={`text-xs ${s <= bounty.Student_Rating ? 'text-yellow-500' : 'text-slate-700'}`}>★</span>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-600 block mt-0.5">Your rating</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
