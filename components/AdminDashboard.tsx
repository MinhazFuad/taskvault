'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

// ─── helpers ────────────────────────────────────────────────────────────────

const n = (v: any) => Number(v) || 0;

const fmt$ = (v: any) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n(v));

const ROLE_BADGE: Record<string, string> = {
  Student:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Corporate:  'bg-violet-500/15 text-violet-400 border-violet-500/25',
  Instructor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  Admin:      'bg-red-500/15 text-red-400 border-red-500/25',
};

// ─── sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent = 'text-white',
}: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-5 space-y-1">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-extrabold leading-none ${accent}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500 pt-0.5">{sub}</p>}
    </div>
  );
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl text-xs">
      {label && <p className="text-slate-400 font-bold mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.color || '#fff' }} className="font-semibold">
          {p.name ?? p.dataKey}: <span className="text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// Thin SVG ring for a single percentage value
function RingChart({ pct, color, size = 96 }: { pct: number; color: string; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(pct / 100, 1)) * circ;
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${size / 2}px ${size / 2}px`, transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size < 80 ? 13 : 16} fontWeight={800}
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ─── main ───────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); else setError(j.error || 'Failed'); })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 animate-pulse text-lg font-medium">
      Loading Command Centre…
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-400 font-bold">{error}</div>
  );

  const { userStats: u, bountyStats: b, courseStats: c, recentUsers, appStats: a } = data;

  // ── derived data for charts ──────────────────────────────────────────────

  const userPie = [
    { name: 'Students',    value: n(u.Total_Students),    color: '#60a5fa' },
    { name: 'Corporate',   value: n(u.Total_Corporate),   color: '#a78bfa' },
    { name: 'Instructors', value: n(u.Total_Instructors), color: '#34d399' },
  ].filter(d => d.value > 0);

  const pipeline = [
    { stage: 'Completed',    count: n(b.Completed_Bounties),    color: '#34d399' },
    { stage: 'Under Review', count: n(b.Under_Review_Bounties), color: '#fb923c' },
    { stage: 'In Progress',  count: n(b.Assigned_Bounties),     color: '#60a5fa' },
    { stage: 'Open',         count: n(b.Open_Bounties),         color: '#94a3b8' },
  ];

  const totalEscrow    = n(b.Escrow_Released) + n(b.Escrow_Locked);
  const releasedPct    = totalEscrow > 0 ? (n(b.Escrow_Released) / totalEscrow) * 100 : 0;
  const completionRate = n(c.Total_Enrollments) > 0
    ? (n(c.Total_Completions) / n(c.Total_Enrollments)) * 100 : 0;
  const totalActive    = n(u.Total_Users) - n(u.Total_Banned);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-8 text-white">

      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 border border-red-500/25 px-3 py-1 rounded-full">
            Admin
          </span>
          <h1 className="text-3xl font-extrabold mt-2 tracking-tight">Command Centre</h1>
          <p className="text-slate-400 text-sm mt-0.5">Live snapshot of the entire platform.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {n(a?.Pending_Applications) > 0 && (
            <Link
              href="/dashboard/admin/applications"
              className="flex items-center gap-2.5 bg-yellow-600 hover:bg-yellow-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-yellow-900/30 transition-all text-sm shrink-0 animate-pulse"
            >
              🎓 Applications
              <span className="bg-yellow-500/60 px-2 py-0.5 rounded-lg text-xs font-bold">{n(a.Pending_Applications)}</span>
            </Link>
          )}
          <Link
            href="/dashboard/admin/users"
            className="flex items-center gap-2.5 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-red-900/30 transition-all text-sm shrink-0"
          >
            Manage Users
            <span className="bg-red-500/60 px-2 py-0.5 rounded-lg text-xs font-bold">{n(u.Total_Users)}</span>
          </Link>
        </div>
      </div>

      {/* ── 4 hero KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Accounts"
          value={totalActive.toLocaleString()}
          sub={n(u.Total_Banned) > 0 ? `${n(u.Total_Banned)} banned` : 'No bans active'}
          accent="text-white"
        />
        <KpiCard
          label="Bounties Completed"
          value={n(b.Completed_Bounties).toLocaleString()}
          sub={`of ${n(b.Total_Bounties)} total posted`}
          accent="text-emerald-400"
        />
        <KpiCard
          label="Escrow Released"
          value={fmt$(b.Escrow_Released)}
          sub={`${fmt$(b.Escrow_Locked)} still locked`}
          accent="text-emerald-400"
        />
        <KpiCard
          label="Course Completions"
          value={n(c.Total_Completions).toLocaleString()}
          sub={`across ${n(c.Total_Courses)} published courses`}
          accent="text-blue-400"
        />
      </div>

      {/* ── main 2-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT col — charts */}
        <div className="lg:col-span-2 space-y-6">

          {/* User Distribution */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">User Distribution</p>
            <div className="flex flex-col sm:flex-row items-center gap-6">

              {/* donut */}
              <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userPie}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={85}
                      paddingAngle={3} dataKey="value" stroke="none"
                    >
                      {userPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-extrabold leading-none">{n(u.Total_Users)}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Total</p>
                </div>
              </div>

              {/* legend */}
              <div className="flex flex-col gap-4 flex-1 min-w-0">
                {userPie.map(seg => {
                  const pct = n(u.Total_Users) > 0 ? Math.round((seg.value / n(u.Total_Users)) * 100) : 0;
                  return (
                    <div key={seg.name}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                          <span className="text-sm font-semibold text-slate-200">{seg.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{seg.value}</span>
                          <span className="text-xs font-bold text-slate-300">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: seg.color }} />
                      </div>
                    </div>
                  );
                })}
                {n(u.Total_Admins) > 0 && (
                  <p className="text-[10px] text-slate-600 font-mono">{n(u.Total_Admins)} admin account{n(u.Total_Admins) !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bounty Pipeline */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Bounty Pipeline</p>
            <p className="text-[11px] text-slate-600 mb-5">{n(b.Total_Bounties)} total bounties across all stages</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pipeline} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="stage" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {pipeline.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Escrow Flow */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Escrow Flow</p>
            <div className="flex items-end gap-6 mb-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Released</p>
                <p className="text-2xl font-extrabold text-emerald-400">{fmt$(b.Escrow_Released)}</p>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Locked</p>
                <p className="text-2xl font-extrabold text-orange-400">{fmt$(b.Escrow_Locked)}</p>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">All-time</p>
                <p className="text-2xl font-extrabold text-white">{fmt$(b.Total_Bounty_Value)}</p>
              </div>
            </div>
            {/* split bar */}
            <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden flex gap-0.5">
              <div className="h-full bg-emerald-500 rounded-l-full transition-all duration-700" style={{ width: `${releasedPct}%` }} />
              <div className="h-full bg-orange-500 rounded-r-full transition-all duration-700" style={{ width: `${100 - releasedPct}%` }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 font-bold">
              <span>Released — {Math.round(releasedPct)}%</span>
              <span>Locked — {Math.round(100 - releasedPct)}%</span>
            </div>
          </div>
        </div>

        {/* RIGHT col */}
        <div className="space-y-6">

          {/* LMS Stats */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">LMS Performance</p>
            <div className="flex items-center gap-5">
              <RingChart pct={completionRate} color="#60a5fa" size={96} />
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Completion Rate</p>
                  <p className="text-sm font-bold text-slate-200">{n(c.Total_Completions)} / {n(c.Total_Enrollments)} enrolled</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Courses Live</p>
                  <p className="text-xl font-extrabold text-white">{n(c.Total_Courses)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Signups */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Signups</p>
              <Link href="/dashboard/admin/users" className="text-[11px] font-bold text-blue-400 hover:underline">
                All →
              </Link>
            </div>

            <div className="space-y-1">
              {recentUsers.map((user: any) => (
                <div key={user.User_ID} className="flex items-center gap-3 py-2 border-b border-slate-800/80 last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${user.Is_Banned ? 'bg-red-900/40 text-red-400' : 'bg-slate-700 text-slate-200'}`}>
                    {user.Full_Name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{user.Full_Name}</p>
                    <p className="text-[10px] text-slate-500 truncate font-mono">{user.Email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${ROLE_BADGE[user.Role] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      {user.Role}
                    </span>
                    {user.Is_Banned && (
                      <span className="text-[9px] text-red-400 font-bold uppercase">Banned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
