'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STAKE: Record<string, number> = { Junior: 20, Intermediate: 40, Advanced: 80 };

function BountyCard({ bounty }: { bounty: any }) {
  const stakeRp = STAKE[bounty.Experience_Level] ?? 20;
  const daysLeft = Math.ceil((new Date(bounty.Due_Date).getTime() - Date.now()) / (1000 * 3600 * 24));
  const isOverdue = daysLeft < 0;
  const isUrgent  = daysLeft <= 2 && !isOverdue;

  return (
    <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{bounty.Company_Name}</p>
          <p className="text-sm font-bold text-white mt-0.5 leading-snug">{bounty.Title}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
          bounty.Status === 'Assigned'
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
        }`}>
          {bounty.Status === 'Assigned' ? 'In Progress' : 'Under Review'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-800/60 rounded-lg p-2">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Reward</p>
          <p className="text-xs font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(0)}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Staked</p>
          <p className="text-xs font-extrabold text-orange-400">{stakeRp} RP</p>
        </div>
        <div className={`rounded-lg p-2 ${isOverdue ? 'bg-red-500/10' : isUrgent ? 'bg-yellow-500/10' : 'bg-slate-800/60'}`}>
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Due</p>
          <p className={`text-xs font-extrabold ${isOverdue ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-slate-300'}`}>
            {isOverdue ? 'Overdue' : `${daysLeft}d left`}
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/my-bounties"
        className="block w-full text-center text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2 rounded-lg transition-all border border-slate-700"
      >
        {bounty.Status === 'Assigned' ? 'Submit Work →' : 'View Status →'}
      </Link>
    </div>
  );
}

export default function StudentDashboard({ userId }: { userId: number }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [metricsRes, coursesRes] = await Promise.all([
          fetch(`/api/dashboard/student?id=${userId}&t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/courses?userId=${userId}`),
        ]);

        const contentType = metricsRes.headers.get('content-type');
        if (!contentType?.includes('application/json')) throw new Error('Database response error. Check XAMPP.');

        const metricsJson = await metricsRes.json();
        if (!metricsRes.ok || !metricsJson.success) throw new Error(metricsJson.error || 'Failed to fetch dashboard');
        setMetrics(metricsJson.data);

        const coursesJson = await coursesRes.json();
        if (coursesJson.success) {
          setCourses(coursesJson.data.filter((c: any) => !c.Is_Completed).slice(0, 3));
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  if (loading) return <div className="p-8 text-slate-400 text-center text-xl animate-pulse font-medium">Accessing Vault...</div>;
  if (error)   return <div className="p-8 text-red-400 text-center font-bold">Error: {error}</div>;

  const bounties      = metrics?.bounties || [];
  const inProgress    = bounties.filter((b: any) => b.Status === 'Assigned');
  const underReview   = bounties.filter((b: any) => b.Status === 'Under_Review');
  const hasAnyBounty  = inProgress.length > 0 || underReview.length > 0;

  const cooldownUntil  = metrics?.Cooldown_Until ? new Date(metrics.Cooldown_Until) : null;
  const isOnCooldown   = !!(cooldownUntil && cooldownUntil > new Date());
  const cooldownDaysLeft = isOnCooldown
    ? Math.ceil((cooldownUntil!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const tierStyles: Record<string, string> = {
    Advanced:     'bg-purple-500/10 text-purple-400 border-purple-500/25',
    Intermediate: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
    Junior:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  };
  const tierValueColor: Record<string, string> = {
    Advanced: 'text-purple-400', Intermediate: 'text-blue-400', Junior: 'text-emerald-400',
  };
  const tier = metrics?.Skill_Level || 'Junior';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white">

      {/* ── HERO HEADER ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-800/90 to-slate-900/70 border border-slate-700/60 rounded-2xl px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl backdrop-blur-sm">
        <div>
          <p className="text-slate-500 text-sm font-medium">Welcome back</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-0.5">{metrics?.Full_Name}</h1>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${tierStyles[tier]}`}>
              {tier} Tier
            </span>
            {isOnCooldown && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">
                ⛔ Cooldown Active
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/dashboard/bounties"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/30"
          >
            Browse Bounties
          </Link>
          <Link
            href="/dashboard/my-bounties"
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border border-slate-600"
          >
            My Work Studio
          </Link>
        </div>
      </div>

      {/* ── COOLDOWN BANNER ──────────────────────────────── */}
      {isOnCooldown && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-xl mt-0.5 shrink-0">⛔</span>
          <div>
            <p className="font-bold text-red-400 text-sm">Penalty Cooldown Active</p>
            <p className="text-red-300/70 text-xs mt-0.5">
              You missed a bounty deadline. New claims are blocked for{' '}
              <strong>{cooldownDaysLeft} more {cooldownDaysLeft === 1 ? 'day' : 'days'}</strong>{' '}
              (until {cooldownUntil!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}).
            </p>
          </div>
        </div>
      )}

      {/* ── STATS ROW ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 shadow-lg">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Available RP</p>
          <p className="text-2xl font-extrabold text-blue-400 mt-1.5">
            {(metrics?.Available_Rep_Points || 0).toLocaleString()}
          </p>
          {(metrics?.Locked_RP || 0) > 0 ? (
            <p className="text-[10px] text-orange-400/80 mt-1 font-semibold">+{metrics.Locked_RP} RP staked</p>
          ) : (
            <p className="text-[10px] text-slate-600 mt-1">None staked</p>
          )}
        </div>

        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 shadow-lg">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Wallet</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1.5">
            ${parseFloat(metrics?.Fiat_Balance || 0).toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-600 mt-1">Available credits</p>
        </div>

        <Link
          href="/dashboard/leaderboards"
          className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 shadow-lg hover:border-slate-500 transition-all group"
        >
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest group-hover:text-slate-400 transition-colors">
            Skill Tier
          </p>
          <p className={`text-2xl font-extrabold mt-1.5 ${tierValueColor[tier]}`}>{tier}</p>
          <p className="text-[10px] text-slate-600 mt-1 group-hover:text-slate-400 transition-colors">
            Global Leaderboard →
          </p>
        </Link>

        <div className="bg-slate-800/70 border border-yellow-500/15 rounded-2xl p-5 shadow-lg">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Client Rating</p>
          {metrics?.Avg_Talent_Rating ? (
            <>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <p className="text-2xl font-extrabold text-yellow-400">{metrics.Avg_Talent_Rating}</p>
                <p className="text-slate-500 text-xs">/ 5★</p>
              </div>
              <p className="text-[10px] text-slate-600 mt-1">
                {metrics.Total_Talent_Reviews} review{metrics.Total_Talent_Reviews !== 1 ? 's' : ''} from clients
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-extrabold text-slate-600 mt-1.5">—</p>
              <p className="text-[10px] text-slate-600 mt-1">Complete bounties to get rated</p>
            </>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT — Bounties (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* In Progress */}
          <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse block"></span>
                <h2 className="font-bold text-white">In Progress</h2>
                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                  {inProgress.length}
                </span>
              </div>
              <Link href="/dashboard/my-bounties" className="text-xs text-slate-400 hover:text-white transition-colors font-medium">
                View all →
              </Link>
            </div>

            {inProgress.length === 0 ? (
              <div className="border border-dashed border-slate-700 rounded-xl p-6 text-center space-y-1.5">
                <p className="text-slate-400 text-sm font-semibold">No active bounties</p>
                <p className="text-slate-600 text-xs">Claim a bounty from the board to start earning.</p>
                <Link href="/dashboard/bounties" className="text-blue-400 text-xs font-bold hover:underline inline-block pt-1.5">
                  Browse Board →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {inProgress.map((b: any) => <BountyCard key={b.Bounty_ID} bounty={b} />)}
              </div>
            )}
          </section>

          {/* Under Review */}
          <section className="bg-slate-800/50 border border-orange-500/20 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse block"></span>
                <h2 className="font-bold text-white">Awaiting Review</h2>
                <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
                  {underReview.length}
                </span>
              </div>
              <Link href="/dashboard/my-bounties" className="text-xs text-slate-400 hover:text-white transition-colors font-medium">
                View all →
              </Link>
            </div>

            {underReview.length === 0 ? (
              <div className="border border-dashed border-slate-700/50 rounded-xl p-5 text-center">
                <p className="text-slate-500 text-sm">Nothing pending review right now.</p>
                {!hasAnyBounty && (
                  <p className="text-slate-600 text-xs mt-1">Submit your work from the My Work Studio after claiming a bounty.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {underReview.map((b: any) => <BountyCard key={b.Bounty_ID} bounty={b} />)}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — Sidebar (1/3) */}
        <div className="space-y-5">

          {/* Earn More RP */}
          <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white">Earn More RP</h2>
              <Link href="/dashboard/courses" className="text-xs text-slate-400 hover:text-white transition-colors font-medium">
                All courses →
              </Link>
            </div>

            {courses.length > 0 ? (
              <div className="space-y-2.5">
                {courses.map((course: any) => (
                  <Link
                    key={course.Course_ID}
                    href={`/dashboard/courses/${course.Course_ID}`}
                    className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-700 hover:border-blue-500/40 rounded-xl p-3 transition-all group"
                  >
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate group-hover:text-blue-300 transition-colors">
                        {course.Title}
                      </p>
                      <p className="text-slate-500 text-[10px] mt-0.5">
                        {course.Total_Modules} modules · <span className="text-slate-400">{course.Reward_Skill}</span>
                      </p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold text-xs px-2 py-1 rounded-lg shrink-0 whitespace-nowrap">
                      +{course.Reward_RP} RP
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-3">
                All available courses completed!
              </p>
            )}

            {/* RP mechanics cheatsheet */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3.5 space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">How RP works</p>
              <ul className="space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                <li>📚 Complete courses → earn RP + unlock skills</li>
                <li>⚡ Claim bounties → stake RP as commitment</li>
                <li>✅ Approved → stake returned + speed bonus</li>
                <li>⛔ Miss deadline → stake forfeited + −15%</li>
              </ul>
            </div>
          </section>

          {/* Instructor CTA */}
          <Link
            href="/dashboard/instructor-apply"
            className="block bg-gradient-to-br from-purple-900/30 to-slate-900/60 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-5 shadow-xl transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🎓</span>
              <div>
                <h2 className="font-bold text-white group-hover:text-purple-300 transition-colors text-sm">
                  Become an Instructor
                </h2>
                <p className="text-slate-500 text-xs">Teach on the platform &amp; earn</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>3,000 RP · 4.8★ required</span>
              <span className="text-purple-400 group-hover:underline">Learn more →</span>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}
