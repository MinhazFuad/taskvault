'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

type SortKey = 'newest' | 'highest-reward' | 'due-soonest' | 'lowest-stake';
type FilterKey = 'all' | 'claimable' | 'locked';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest',         label: 'Newest'         },
  { key: 'highest-reward', label: 'Highest Reward'  },
  { key: 'due-soonest',    label: 'Due Soonest'     },
  { key: 'lowest-stake',   label: 'Lowest Stake'    },
];

const TIER_FILTERS = ['All', 'Junior', 'Intermediate', 'Advanced'] as const;
type TierFilter = typeof TIER_FILTERS[number];

const TIER_COLORS: Record<string, string> = {
  Advanced:     'text-purple-400',
  Intermediate: 'text-blue-400',
  Junior:       'text-emerald-400',
};

const TIER_BADGE: Record<string, string> = {
  Advanced:     'bg-purple-500/10 text-purple-400 border-purple-500/25',
  Intermediate: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  Junior:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
};

function getStudentLevel(rp: number) {
  if (rp >= 1001) return 'Advanced';
  if (rp >= 401)  return 'Intermediate';
  return 'Junior';
}

function getStake(level: string) {
  if (level === 'Intermediate') return 40;
  if (level === 'Advanced')     return 80;
  return 20;
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 3600 * 24));
}

export default function PublicBountyBoardPage() {
  const router = useRouter();

  const [userId, setUserId]           = useState<number | null>(null);
  const [studentRp, setStudentRp]     = useState(0);
  const [studentSkills, setStudentSkills] = useState<string[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [bounties, setBounties]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [claimError, setClaimError]   = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<number | null>(null);
  const [error, setError]             = useState<string | null>(null);

  // Controls
  const [search, setSearch]     = useState('');
  const [sort, setSort]         = useState<SortKey>('newest');
  const [filter, setFilter]     = useState<FilterKey>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('All');

  const loadBountyBoard = async () => {
    try {
      setLoading(true);
      setClaimError(null);
      const authRes  = await fetch('/api/auth/me');
      const authJson = await authRes.json();
      if (!authJson.success || authJson.user.role !== 'Student') { router.push('/dashboard'); return; }

      const uid = authJson.user.userId;
      setUserId(uid);

      const [metricsRes, bountiesRes] = await Promise.all([
        fetch(`/api/dashboard/student?id=${uid}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/bounties?status=Open&t=${Date.now()}`,         { cache: 'no-store' }),
      ]);

      const metricsJson = await metricsRes.json();
      if (metricsJson.success && metricsJson.data) {
        setStudentRp(parseInt(metricsJson.data.Available_Rep_Points) || 0);
        setStudentSkills(metricsJson.data.earnedSkills || []);
        const cd = metricsJson.data.Cooldown_Until ? new Date(metricsJson.data.Cooldown_Until) : null;
        setCooldownUntil(cd && cd > new Date() ? cd : null);
      }

      const bountiesJson = await bountiesRes.json();
      if (bountiesJson.success) setBounties(bountiesJson.data);
      else setError(bountiesJson.error || 'Failed to load bounties');
    } catch {
      setError('Network error connecting to the bounty board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBountyBoard(); }, [router]);

  const handleClaim = async (bountyId: number, requiredRp: number, requiredSkill: string, stakeRp: number) => {
    if (!userId) return;
    setClaimError(null);

    const hasSkill = studentSkills.includes(requiredSkill.toLowerCase().trim());
    if (studentRp < requiredRp || !hasSkill) {
      setClaimError('You do not meet the tier and skill prerequisites for that task.');
      return;
    }
    if (studentRp < stakeRp) {
      setClaimError(`You need ${stakeRp} RP to stake on that bounty but only have ${studentRp} RP.`);
      return;
    }
    if (!confirm(`Commit to this bounty? You will stake ${stakeRp} RP — returned with a bonus on approval, forfeited on deadline miss.`)) return;

    setActionLoading(bountyId);
    try {
      const res  = await fetch('/api/bounties/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bountyId, studentId: userId }),
      });
      const json = await res.json();
      if (json.success) {
        setClaimSuccess(bountyId);
        await loadBountyBoard();
      } else {
        setClaimError(json.error || 'Failed to claim bounty.');
      }
    } catch {
      setClaimError('Network error processing assignment.');
    } finally {
      setActionLoading(null);
    }
  };

  const studentLevel    = getStudentLevel(studentRp);
  const cooldownDaysLeft = cooldownUntil
    ? Math.ceil((cooldownUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // Derived counts for filter tabs
  const counts = useMemo(() => {
    const claimable = bounties.filter(b => {
      const stake = getStake(b.Experience_Level);
      return studentRp >= b.Required_RP &&
             studentSkills.includes(b.Required_Skill.toLowerCase().trim()) &&
             studentRp >= stake &&
             !cooldownUntil;
    }).length;
    return { all: bounties.length, claimable, locked: bounties.length - claimable };
  }, [bounties, studentRp, studentSkills, cooldownUntil]);

  const visible = useMemo(() => {
    let list = [...bounties];

    // Eligibility filter
    if (filter === 'claimable') {
      list = list.filter(b => {
        const stake = getStake(b.Experience_Level);
        return studentRp >= b.Required_RP &&
               studentSkills.includes(b.Required_Skill.toLowerCase().trim()) &&
               studentRp >= stake &&
               !cooldownUntil;
      });
    } else if (filter === 'locked') {
      list = list.filter(b => {
        const stake = getStake(b.Experience_Level);
        return !(studentRp >= b.Required_RP &&
                 studentSkills.includes(b.Required_Skill.toLowerCase().trim()) &&
                 studentRp >= stake &&
                 !cooldownUntil);
      });
    }

    // Tier filter
    if (tierFilter !== 'All') list = list.filter(b => b.Experience_Level === tierFilter);

    // Search
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(b =>
      b.Title.toLowerCase().includes(q) ||
      b.Company_Name.toLowerCase().includes(q) ||
      b.Required_Skill.toLowerCase().includes(q) ||
      b.Description.toLowerCase().includes(q)
    );

    // Sort
    switch (sort) {
      case 'highest-reward':
        list.sort((a, b) => parseFloat(b.Reward_Amount) - parseFloat(a.Reward_Amount));
        break;
      case 'due-soonest':
        list.sort((a, b) => new Date(a.Due_Date).getTime() - new Date(b.Due_Date).getTime());
        break;
      case 'lowest-stake':
        list.sort((a, b) => getStake(a.Experience_Level) - getStake(b.Experience_Level));
        break;
      default: // newest: keep server order
        break;
    }

    return list;
  }, [bounties, filter, tierFilter, search, sort, studentRp, studentSkills, cooldownUntil]);

  const clearFilters = () => { setSearch(''); setFilter('all'); setTierFilter('All'); setSort('newest'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">

        {/* ── COOLDOWN BANNER ──────────────────────────── */}
        {cooldownUntil && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-red-400 text-xl mt-0.5 shrink-0">⛔</span>
            <div>
              <p className="font-bold text-red-400 text-sm">Bounty Claims Blocked — Penalty Cooldown Active</p>
              <p className="text-red-300/70 text-xs mt-0.5">
                You cannot claim new bounties for{' '}
                <strong>{cooldownDaysLeft} more {cooldownDaysLeft === 1 ? 'day' : 'days'}</strong>{' '}
                (until {cooldownUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}).
              </p>
            </div>
          </div>
        )}

        {/* ── CLAIM ERROR / SUCCESS ───────────────────── */}
        {claimError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <p className="text-red-400 text-sm font-semibold">{claimError}</p>
            <button onClick={() => setClaimError(null)} className="text-red-500 hover:text-red-300 text-lg shrink-0">✕</button>
          </div>
        )}

        {/* ── PAGE HEADER ──────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Bounty Board</h1>
            <p className="text-slate-400 text-sm mt-1">
              Escrow-funded corporate tasks — stake RP to commit, earn cash and bonus RP on approval.
            </p>
          </div>

          {/* STUDENT PROFILE CHIP */}
          {!loading && (
            <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 rounded-2xl px-5 py-3 shrink-0">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Your Tier</p>
                <p className={`text-xl font-extrabold ${TIER_COLORS[studentLevel]}`}>{studentLevel}</p>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Available RP</p>
                <p className="text-xl font-extrabold text-blue-400">{studentRp.toLocaleString()}</p>
              </div>
              {studentSkills.length > 0 && (
                <>
                  <div className="h-8 w-px bg-slate-700" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {studentSkills.slice(0, 4).map(s => (
                        <span key={s} className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded capitalize">
                          {s}
                        </span>
                      ))}
                      {studentSkills.length > 4 && (
                        <span className="text-[9px] text-slate-500 font-bold px-1 py-0.5">+{studentSkills.length - 4}</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── CONTROLS ─────────────────────────────────── */}
        {!loading && !error && (
          <div className="space-y-3">
            {/* Row 1: search + sort */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search by title, company, skill, or keyword…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">✕</button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap shrink-0">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSort(opt.key)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      sort === opt.key
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                        : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: filter tabs + tier pills */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Eligibility filter tabs */}
              <div className="flex gap-1 bg-slate-900/60 border border-slate-700/60 p-1 rounded-xl">
                {([
                  { key: 'all' as FilterKey,      label: 'All',       count: counts.all       },
                  { key: 'claimable' as FilterKey, label: 'Claimable', count: counts.claimable },
                  { key: 'locked' as FilterKey,    label: 'Locked',    count: counts.locked    },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      filter === tab.key ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      filter === tab.key ? 'bg-slate-600 text-slate-200' : 'bg-slate-800 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tier pills */}
              <div className="flex gap-1.5 flex-wrap">
                {TIER_FILTERS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTierFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      tierFilter === t
                        ? t === 'All'
                          ? 'bg-slate-700 border-slate-500 text-white'
                          : t === 'Advanced'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : t === 'Intermediate'
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                          : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-6 text-red-400 text-center font-semibold">
            {error}
          </div>
        )}

        {/* ── BODY ────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6 animate-pulse space-y-4">
                <div className="flex justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-slate-700/60 rounded w-1/3" />
                    <div className="h-5 bg-slate-700/60 rounded w-4/5" />
                  </div>
                  <div className="h-12 w-20 bg-slate-700/40 rounded-xl shrink-0" />
                </div>
                <div className="h-20 bg-slate-700/30 rounded-xl" />
                <div className="h-2 bg-slate-700/40 rounded-full" />
                <div className="h-11 bg-slate-700/40 rounded-xl" />
              </div>
            ))}
          </div>
        ) : !error && visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <span className="text-5xl">{search ? '🔍' : filter === 'claimable' ? '🔓' : '📋'}</span>
            <h2 className="text-lg font-bold text-white">
              {search
                ? `No bounties matching "${search}"`
                : filter === 'claimable'
                ? 'No claimable bounties right now'
                : bounties.length === 0
                ? 'No open bounties at the moment'
                : 'No bounties match your filters'}
            </h2>
            <p className="text-slate-500 text-sm max-w-xs">
              {search
                ? 'Try different keywords or clear your search.'
                : filter === 'claimable'
                ? 'Complete more courses to unlock skills and reach higher tiers.'
                : 'Corporates post new bounties regularly — check back soon.'}
            </p>
            {(search || filter !== 'all' || tierFilter !== 'All') && (
              <button onClick={clearFilters} className="mt-1 text-blue-400 hover:text-blue-300 text-sm font-bold hover:underline transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        ) : !error && (
          <>
            <p className="text-xs text-slate-600 font-medium -mt-2">
              Showing {visible.length} of {bounties.length} open {bounties.length === 1 ? 'bounty' : 'bounties'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {visible.map(bounty => {
                const stakeRp       = getStake(bounty.Experience_Level);
                const meetsTier     = studentRp >= bounty.Required_RP;
                const meetsSkill    = studentSkills.includes(bounty.Required_Skill.toLowerCase().trim());
                const canAffordStake= studentRp >= stakeRp;
                const isQualified   = meetsTier && meetsSkill && canAffordStake && !cooldownUntil;
                const isLoadingThis = actionLoading === bounty.Bounty_ID;
                const days          = daysUntil(bounty.Due_Date);
                const isUrgent      = days <= 3 && days >= 0;
                const isOverdue     = days < 0;

                return (
                  <div
                    key={bounty.Bounty_ID}
                    className={`flex flex-col rounded-2xl border transition-all duration-200 shadow-lg ${
                      isQualified
                        ? 'bg-slate-800/70 border-slate-700 hover:border-blue-500/50 hover:shadow-blue-900/20'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-80'
                    }`}
                  >
                    {/* CARD HEADER */}
                    <div className="p-5 pb-4 space-y-3">
                      {/* Company row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                            {bounty.Company_Name}
                          </span>
                          {bounty.Avg_Client_Rating ? (
                            <span className="flex items-center gap-0.5 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-400 shrink-0">
                              ★ {bounty.Avg_Client_Rating}
                              <span className="text-slate-500 font-normal ml-0.5">({bounty.Rating_Count})</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 shrink-0">New client</span>
                          )}
                        </div>

                        {/* Reward */}
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-right shrink-0">
                          <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Reward</p>
                          <p className="text-lg font-extrabold text-emerald-400 leading-none">
                            ${parseFloat(bounty.Reward_Amount).toFixed(0)}
                          </p>
                        </div>
                      </div>

                      {/* Title */}
                      <h2 className="text-lg font-bold text-white leading-snug">{bounty.Title}</h2>

                      {/* Description */}
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                        {bounty.Description}
                      </p>
                    </div>

                    {/* CARD FOOTER */}
                    <div className="px-5 pb-5 mt-auto space-y-3 border-t border-slate-700/50 pt-4">
                      {/* Tags row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Skill */}
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          meetsSkill
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {meetsSkill ? '✓' : '✕'} {bounty.Required_Skill}
                        </span>

                        {/* Tier */}
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          meetsTier ? TIER_BADGE[bounty.Experience_Level] : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {bounty.Experience_Level}
                        </span>

                        {/* Stake */}
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          canAffordStake
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          Stakes {stakeRp} RP
                        </span>

                        {/* Deadline */}
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ml-auto ${
                          isOverdue
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : isUrgent
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700'
                        }`}>
                          {isOverdue ? 'Overdue' : `${days}d left`}
                        </span>
                      </div>

                      {/* CTA */}
                      {isQualified ? (
                        <button
                          onClick={() => handleClaim(bounty.Bounty_ID, bounty.Required_RP, bounty.Required_Skill, stakeRp)}
                          disabled={isLoadingThis}
                          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                          {isLoadingThis
                            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Claiming…</>
                            : <>⚡ Claim Bounty — Stakes {stakeRp} RP</>}
                        </button>
                      ) : (
                        <div className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2.5 px-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 cursor-not-allowed">
                          {cooldownUntil && (
                            <span className="text-red-400 text-xs font-semibold">⛔ Cooldown — {cooldownDaysLeft}d left</span>
                          )}
                          {!cooldownUntil && !meetsTier && (
                            <span className="text-slate-500 text-xs font-semibold">
                              🔒 Need {bounty.Experience_Level} Tier ({bounty.Required_RP}+ RP)
                            </span>
                          )}
                          {!cooldownUntil && !meetsSkill && (
                            <span className="text-slate-500 text-xs font-semibold">
                              🔒 Missing skill: {bounty.Required_Skill}
                            </span>
                          )}
                          {!cooldownUntil && meetsTier && meetsSkill && !canAffordStake && (
                            <span className="text-slate-500 text-xs font-semibold">
                              🔒 Need {stakeRp} RP to stake
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
