'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

function StarDisplay({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={`text-sm ${s <= value ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
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
                {avgReceived ? `${avgReceived}★` : '—'}
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
            <p className="text-3xl">📋</p>
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
