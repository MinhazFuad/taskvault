'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

function StarDisplay({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} className={`w-3.5 h-3.5 fill-current ${s <= value ? 'text-yellow-400' : 'text-slate-700'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
      ))}
    </span>
  );
}

export default function StudentHistoryPage() {
  const router = useRouter();
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const auth = await fetch('/api/auth/me').then(r => r.json());
        if (!auth.success || auth.user.role !== 'Student') { router.push('/dashboard'); return; }

        const res  = await fetch(`/api/dashboard/student?id=${auth.user.userId}&t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();

        if (json.success && json.data) {
          setBounties((json.data.bounties || []).filter((b: any) => b.Status === 'Completed'));
        } else {
          setError(json.error || 'Failed to load history');
        }
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const totalEarned = bounties.reduce((s, b) => s + parseFloat(b.Reward_Amount || 0), 0);
  const rated       = bounties.filter(b => b.Corporate_Rating);
  const avgReceived = rated.length > 0
    ? (rated.reduce((s, b) => s + Number(b.Corporate_Rating), 0) / rated.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 w-full py-8 space-y-8">

        {/* Header */}
        <div>
          <Link href="/dashboard/my-bounties" className="text-blue-400 text-sm hover:underline">← Execution Studio</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Bounty History</h1>
          <p className="text-slate-500 text-sm mt-0.5">Your completed bounties, client ratings, and written feedback.</p>
        </div>

        {/* Stats */}
        {!loading && bounties.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Completed</p>
              <p className="text-2xl font-extrabold text-slate-200 mt-1">{bounties.length}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Earned</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">${totalEarned.toFixed(0)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Avg Rating</p>
              <p className="text-2xl font-extrabold text-yellow-400 mt-1">
                {avgReceived ? <span className="inline-flex items-center gap-1">{avgReceived}<svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span> : '—'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-slate-500 py-16 text-center animate-pulse text-sm">Loading history…</div>
        ) : bounties.length === 0 ? (
          <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-14 text-center space-y-2">
            <svg className="w-12 h-12 text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="text-slate-400 font-semibold">No completed bounties yet</p>
            <p className="text-slate-600 text-sm">Complete your first bounty to see your history here.</p>
            <Link href="/dashboard/bounties" className="text-blue-400 text-sm font-bold hover:underline block pt-1">Browse Bounties →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bounties.map(bounty => (
              <div key={bounty.Bounty_ID} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

                {/* Top row */}
                <div className="px-6 py-4 flex items-start justify-between gap-4 border-b border-slate-800/60">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{bounty.Company_Name}</p>
                    <h3 className="font-bold text-slate-200 text-base mt-0.5 leading-snug">{bounty.Title}</h3>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                      <span>{bounty.Experience_Level}</span>
                      <span className="text-slate-700">·</span>
                      <span>{bounty.Required_Skill}</span>
                      <span className="text-slate-700">·</span>
                      <span>
                        {bounty.Submitted_At
                          ? new Date(bounty.Submitted_At).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Completed'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</p>
                    <span className="text-[10px] font-bold text-slate-500">earned</span>
                  </div>
                </div>

                {/* Ratings */}
                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-5">

                  {/* Client's rating of student */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client's Rating of You</p>
                    {bounty.Corporate_Rating ? (
                      <div className="space-y-1.5">
                        <StarDisplay value={Number(bounty.Corporate_Rating)} />
                        {bounty.Corporate_Review ? (
                          <blockquote className="text-slate-400 text-xs leading-relaxed italic bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-2.5">
                            "{bounty.Corporate_Review}"
                          </blockquote>
                        ) : (
                          <p className="text-slate-600 text-xs">No written feedback provided.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-600 text-xs">Client hasn't rated yet.</p>
                    )}
                  </div>

                  {/* Student's rating of client */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Rating of the Client</p>
                    {bounty.Student_Rating ? (
                      <div className="space-y-1.5">
                        <StarDisplay value={Number(bounty.Student_Rating)} />
                        {bounty.Student_Review && (
                          <p className="text-slate-500 text-xs leading-relaxed italic">"{bounty.Student_Review}"</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-600 text-xs">No rating submitted.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
