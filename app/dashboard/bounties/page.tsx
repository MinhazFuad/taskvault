'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

type SortKey = 'newest' | 'highest-reward' | 'due-soonest' | 'lowest-stake';
type FilterKey = 'all' | 'eligible' | 'locked';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest',         label: 'Newest'        },
  { key: 'highest-reward', label: 'Highest Reward' },
  { key: 'due-soonest',   label: 'Due Soonest'    },
  { key: 'lowest-stake',  label: 'Lowest Stake'   },
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

  const [userId, setUserId]                   = useState<number | null>(null);
  const [studentRp, setStudentRp]             = useState(0);
  const [studentSkills, setStudentSkills]     = useState<string[]>([]);
  const [cooldownUntil, setCooldownUntil]     = useState<Date | null>(null);
  const [bounties, setBounties]               = useState<any[]>([]);
  const [appliedIds, setAppliedIds]           = useState<Set<number>>(new Set());
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);

  // Apply modal state
  const [applyModal, setApplyModal]           = useState<{ bountyId: number; title: string; stakeRp: number } | null>(null);
  const [coverLetter, setCoverLetter]         = useState('');
  const [applyLoading, setApplyLoading]       = useState(false);
  const [applyError, setApplyError]           = useState<string | null>(null);

  // Controls
  const [search, setSearch]         = useState('');
  const [sort, setSort]             = useState<SortKey>('newest');
  const [filter, setFilter]         = useState<FilterKey>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('All');

  const loadPage = async () => {
    try {
      setLoading(true);
      const authRes  = await fetch('/api/auth/me');
      const authJson = await authRes.json();
      if (!authJson.success || authJson.user.role !== 'Student') { router.push('/dashboard'); return; }

      const uid = authJson.user.userId;
      setUserId(uid);

      const [metricsRes, bountiesRes, appsRes] = await Promise.all([
        fetch(`/api/dashboard/student?id=${uid}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/bounties?status=Open&t=${Date.now()}`,        { cache: 'no-store' }),
        fetch(`/api/bounties/apply?studentId=${uid}`,             { cache: 'no-store' }),
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

      const appsJson = await appsRes.json();
      if (appsJson.success) {
        setAppliedIds(new Set(appsJson.data.map((a: any) => a.Bounty_ID)));
      }
    } catch {
      setError('Network error connecting to the bounty board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPage(); }, [router]);

  const openApplyModal = (bountyId: number, title: string, stakeRp: number) => {
    setCoverLetter('');
    setApplyError(null);
    setApplyModal({ bountyId, title, stakeRp });
  };

  const handleApply = async () => {
    if (!userId || !applyModal) return;
    setApplyLoading(true);
    setApplyError(null);
    try {
      const res = await fetch('/api/bounties/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bountyId: applyModal.bountyId, studentId: userId, coverLetter }),
      });
      const json = await res.json();
      if (json.success) {
        setAppliedIds(prev => new Set([...prev, applyModal.bountyId]));
        setApplyModal(null);
      } else {
        setApplyError(json.error || 'Failed to apply.');
      }
    } catch {
      setApplyError('Network error. Please try again.');
    } finally {
      setApplyLoading(false);
    }
  };

  const studentLevel     = getStudentLevel(studentRp);
  const cooldownDaysLeft = cooldownUntil
    ? Math.ceil((cooldownUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const counts = useMemo(() => {
    const eligible = bounties.filter(b => {
      const stake = getStake(b.Experience_Level);
      return studentRp >= b.Required_RP &&
             studentSkills.includes(b.Required_Skill.toLowerCase().trim()) &&
             studentRp >= stake &&
             !cooldownUntil;
    }).length;
    return { all: bounties.length, eligible, locked: bounties.length - eligible };
  }, [bounties, studentRp, studentSkills, cooldownUntil]);

  const visible = useMemo(() => {
    let list = [...bounties];

    if (filter === 'eligible') {
      list = list.filter(b => {
        const stake = getStake(b.Experience_Level);
        return studentRp >= b.Required_RP &&
               studentSkills.includes(b.Required_Skill.toLowerCase().trim()) &&
               studentRp >= stake && !cooldownUntil;
      });
    } else if (filter === 'locked') {
      list = list.filter(b => {
        const stake = getStake(b.Experience_Level);
        return !(studentRp >= b.Required_RP &&
                 studentSkills.includes(b.Required_Skill.toLowerCase().trim()) &&
                 studentRp >= stake && !cooldownUntil);
      });
    }

    if (tierFilter !== 'All') list = list.filter(b => b.Experience_Level === tierFilter);

    const q = search.trim().toLowerCase();
    if (q) list = list.filter(b =>
      b.Title.toLowerCase().includes(q) ||
      b.Company_Name.toLowerCase().includes(q) ||
      b.Required_Skill.toLowerCase().includes(q) ||
      b.Description.toLowerCase().includes(q)
    );

    switch (sort) {
      case 'highest-reward':
        list.sort((a, b) => parseFloat(b.Reward_Amount) - parseFloat(a.Reward_Amount)); break;
      case 'due-soonest':
        list.sort((a, b) => new Date(a.Due_Date).getTime() - new Date(b.Due_Date).getTime()); break;
      case 'lowest-stake':
        list.sort((a, b) => getStake(a.Experience_Level) - getStake(b.Experience_Level)); break;
    }

    return list;
  }, [bounties, filter, tierFilter, search, sort, studentRp, studentSkills, cooldownUntil]);

  const clearFilters = () => { setSearch(''); setFilter('all'); setTierFilter('All'); setSort('newest'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />

      {/* Apply modal */}
      {applyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white">Apply for Bounty</h3>
                <p className="text-slate-400 text-sm mt-0.5 line-clamp-1">{applyModal.title}</p>
              </div>
              <button onClick={() => setApplyModal(null)} className="text-slate-500 hover:text-white leading-none transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs text-orange-300">
              If selected, <strong>{applyModal.stakeRp} RP</strong> will be staked — returned with a bonus on approval.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Cover Letter <span className="text-slate-600 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                rows={4}
                placeholder="Tell the client why you're the right fit — highlight relevant experience, skills, or your approach to this task…"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none placeholder:text-slate-600"
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
              />
            </div>

            {applyError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">{applyError}</div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button" onClick={() => setApplyModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button" onClick={handleApply} disabled={applyLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                {applyLoading
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                  : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Submit Application</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">

        {/* Cooldown banner */}
        {cooldownUntil && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            <div>
              <p className="font-bold text-red-400 text-sm">Applications Blocked — Penalty Cooldown Active</p>
              <p className="text-red-300/70 text-xs mt-0.5">
                You cannot apply to new bounties for{' '}
                <strong>{cooldownDaysLeft} more {cooldownDaysLeft === 1 ? 'day' : 'days'}</strong>{' '}
                (until {cooldownUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}).
              </p>
            </div>
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Bounty Board</h1>
            <p className="text-slate-400 text-sm mt-1">
              Corporate tasks with guaranteed payment — apply with a cover letter, get selected, deliver, earn.
            </p>
          </div>

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
                        <span key={s} className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded capitalize">{s}</span>
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

        {/* Controls */}
        {!loading && !error && (
          <div className="space-y-3">
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
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
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

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 bg-slate-900/60 border border-slate-700/60 p-1 rounded-xl">
                {([
                  { key: 'all'      as FilterKey, label: 'All',      count: counts.all      },
                  { key: 'eligible' as FilterKey, label: 'Eligible', count: counts.eligible },
                  { key: 'locked'   as FilterKey, label: 'Locked',   count: counts.locked   },
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

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-6 text-red-400 text-center font-semibold">{error}</div>
        )}

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
                <div className="h-11 bg-slate-700/40 rounded-xl" />
              </div>
            ))}
          </div>
        ) : !error && visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            {search ? (
              <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            ) : filter === 'eligible' ? (
              <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
            ) : (
              <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            )}
            <h2 className="text-lg font-bold text-white">
              {search ? `No bounties matching "${search}"` : filter === 'eligible' ? 'No eligible bounties right now' : bounties.length === 0 ? 'No open bounties at the moment' : 'No bounties match your filters'}
            </h2>
            <p className="text-slate-500 text-sm max-w-xs">
              {search ? 'Try different keywords or clear your search.' : filter === 'eligible' ? 'Complete more courses to unlock skills.' : 'Corporates post new bounties regularly — check back soon.'}
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
                const isEligible    = meetsTier && meetsSkill && canAffordStake && !cooldownUntil;
                const hasApplied    = appliedIds.has(bounty.Bounty_ID);
                const days          = daysUntil(bounty.Due_Date);
                const isUrgent      = days <= 3 && days >= 0;
                const isOverdue     = days < 0;

                return (
                  <div
                    key={bounty.Bounty_ID}
                    className={`flex flex-col rounded-2xl border transition-all duration-200 shadow-lg ${
                      hasApplied
                        ? 'bg-slate-800/70 border-blue-500/30'
                        : isEligible
                        ? 'bg-slate-800/70 border-slate-700 hover:border-blue-500/50 hover:shadow-blue-900/20'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-80'
                    }`}
                  >
                    <div className="p-5 pb-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{bounty.Company_Name}</span>
                          {bounty.Avg_Client_Rating ? (
                            <span className="flex items-center gap-0.5 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-400 shrink-0">
                                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> {bounty.Avg_Client_Rating}
                              <span className="text-slate-500 font-normal ml-0.5">({bounty.Rating_Count})</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 shrink-0">New client</span>
                          )}
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-right shrink-0">
                          <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Reward</p>
                          <p className="text-lg font-extrabold text-emerald-400 leading-none">${parseFloat(bounty.Reward_Amount).toFixed(0)}</p>
                        </div>
                      </div>

                      <h2 className="text-lg font-bold text-white leading-snug">{bounty.Title}</h2>
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{bounty.Description}</p>
                    </div>

                    <div className="px-5 pb-5 mt-auto space-y-3 border-t border-slate-700/50 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${meetsSkill ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {meetsSkill ? (
                            <svg className="w-3 h-3 inline mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-3 h-3 inline mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          )} {bounty.Required_Skill}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${meetsTier ? TIER_BADGE[bounty.Experience_Level] : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {bounty.Experience_Level}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${canAffordStake ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          Stakes {stakeRp} RP
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ml-auto ${
                          isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : isUrgent ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700'
                        }`}>
                          {isOverdue ? 'Overdue' : `${days}d left`}
                        </span>
                      </div>

                      {hasApplied ? (
                        <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-blue-400 text-sm font-semibold">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Application Submitted
                        </div>
                      ) : isEligible ? (
                        <button
                          onClick={() => openApplyModal(bounty.Bounty_ID, bounty.Title, stakeRp)}
                          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 text-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Apply for Bounty
                        </button>
                      ) : (
                        <div className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2.5 px-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 cursor-not-allowed">
                          {cooldownUntil && <span className="text-red-400 text-xs font-semibold flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Cooldown — {cooldownDaysLeft}d left</span>}
                          {!cooldownUntil && !meetsTier && <span className="text-slate-500 text-xs font-semibold flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Need {bounty.Experience_Level} Tier</span>}
                          {!cooldownUntil && !meetsSkill && <span className="text-slate-500 text-xs font-semibold flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Missing skill: {bounty.Required_Skill}</span>}
                          {!cooldownUntil && meetsTier && meetsSkill && !canAffordStake && <span className="text-slate-500 text-xs font-semibold flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Need {stakeRp} RP to stake</span>}
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
