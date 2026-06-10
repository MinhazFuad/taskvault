'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

type Status = 'All' | 'Open' | 'Assigned' | 'Under_Review' | 'Completed' | 'Cancelled';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Open:         { label: 'Open',         color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  Assigned:     { label: 'In Progress',  color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  Under_Review: { label: 'Under Review', color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  },
  Completed:    { label: 'Completed',    color: 'text-slate-300',   bg: 'bg-slate-700/40',   border: 'border-slate-600/40'   },
  Cancelled:    { label: 'Cancelled',    color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
};

const FILTERS: { key: Status; label: string }[] = [
  { key: 'All',          label: 'All'          },
  { key: 'Open',         label: 'Open'         },
  { key: 'Assigned',     label: 'In Progress'  },
  { key: 'Under_Review', label: 'Under Review' },
  { key: 'Completed',    label: 'Completed'    },
];

export default function BountyHistoryPage() {
  const router = useRouter();
  const [userId,   setUserId]   = useState<number | null>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState<Status>('All');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(async data => {
        if (!data.success || data.user.role !== 'Corporate') { router.push('/dashboard'); return; }
        const uid = data.user.userId;
        setUserId(uid);
        const res = await fetch(`/api/bounties?corporateUserId=${uid}&t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) setBounties(json.data);
        else setError(json.error || 'Failed to load bounties');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = filter === 'All' ? bounties : bounties.filter(b => b.Status === filter);

  const counts: Record<string, number> = { All: bounties.length };
  for (const b of bounties) counts[b.Status] = (counts[b.Status] || 0) + 1;

  const totalReserved = bounties.filter(b => ['Open', 'Assigned', 'Under_Review'].includes(b.Status))
                                .reduce((s, b) => s + parseFloat(b.Reward_Amount || 0), 0);
  const totalReleased = bounties.filter(b => b.Status === 'Completed')
                                .reduce((s, b) => s + parseFloat(b.Reward_Amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <TopNav role="Corporate" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 w-full py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">← Back to Dashboard</Link>
            <h1 className="text-2xl font-bold tracking-tight mt-1">Bounty History</h1>
            <p className="text-slate-400 text-sm mt-0.5">All bounties you've ever posted, across every status.</p>
          </div>
          <Link
            href="/dashboard/manage-bounties"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Post New Bounty
          </Link>
        </div>

        {/* Summary chips */}
        {!loading && bounties.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <SummaryChip label="Total Posted"     value={bounties.length}           color="text-slate-300" />
            <SummaryChip label="Funds on Hold"   value={`$${totalReserved.toFixed(2)}`} color="text-orange-400" />
            <SummaryChip label="Total Released"   value={`$${totalReleased.toFixed(2)}`} color="text-emerald-400" />
            <SummaryChip label="Completed"        value={counts['Completed'] || 0}   color="text-slate-400" />
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                filter === f.key
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {f.label}
              {counts[f.key] !== undefined && counts[f.key] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  filter === f.key ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-500'
                }`}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-slate-500 py-16 text-center animate-pulse text-sm">Loading bounty history…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-14 text-center space-y-2">
            <p className="text-slate-400 font-semibold">
              {filter === 'All' ? 'No bounties posted yet.' : `No bounties with status "${filter}".`}
            </p>
            {filter === 'All' && (
              <Link href="/dashboard/manage-bounties" className="text-blue-400 text-sm hover:underline block pt-1">
                Post your first bounty →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => {
              const cfg   = STATUS_CFG[b.Status] || STATUS_CFG.Open;
              const due   = new Date(b.Due_Date);
              const today = new Date();
              const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
              const isOverdue = daysLeft < 0 && b.Status !== 'Completed' && b.Status !== 'Cancelled';

              return (
                <div key={b.Bounty_ID} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-4">

                    {/* Left */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded border bg-slate-800 border-slate-700 text-slate-400">
                          {b.Experience_Level}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded border bg-slate-800 border-slate-700 text-slate-400">
                          {b.Required_Skill}
                        </span>
                      </div>

                      <h3 className="font-semibold text-white leading-snug">{b.Title}</h3>

                      <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{b.Description}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        <span>Posted {new Date(b.Created_At).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-slate-700">·</span>
                        <span className={isOverdue ? 'text-red-400 font-medium' : ''}>
                          Due {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {isOverdue && ' (overdue)'}
                          {!isOverdue && b.Status === 'Open' && daysLeft <= 7 && ` · ${daysLeft}d left`}
                        </span>
                        {b.Required_RP > 0 && (
                          <>
                            <span className="text-slate-700">·</span>
                            <span>{b.Required_RP} RP required</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {b.Status === 'Completed' ? 'Paid Out' : 'Reserved'}
                      </p>
                      <p className="text-xl font-bold text-emerald-400">${parseFloat(b.Reward_Amount).toFixed(2)}</p>
                      {b.Status === 'Under_Review' && (
                        <Link
                          href="/dashboard/submissions"
                          className="block mt-2 px-3 py-1 text-xs font-semibold rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors"
                        >
                          Review →
                        </Link>
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

function SummaryChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
