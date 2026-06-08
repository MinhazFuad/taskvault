'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

const PLATFORM_SKILLS = [
  "Angular", "AWS", "Azure", "C#", "Cybersecurity", "Data Analysis",
  "Docker", "Flutter", "Go", "Google Cloud (GCP)", "GraphQL", "HTML/CSS",
  "Java", "Kotlin", "Kubernetes", "Machine Learning", "MongoDB", "Next.js",
  "Node.js", "NoSQL", "PHP", "PostgreSQL", "Python", "React", "React Native",
  "Ruby", "Rust", "SQL", "Swift", "Tailwind CSS", "Technical Writing",
  "UI/UX Design", "Vue.js"
];

const LEVEL_CONFIG: Record<string, { color: string; rp: string; desc: string }> = {
  Junior:       { color: 'text-emerald-400', rp: '0 RP',    desc: 'Open to all verified talent' },
  Intermediate: { color: 'text-blue-400',    rp: '401+ RP', desc: 'Experienced contributors only' },
  Advanced:     { color: 'text-purple-400',  rp: '1001+ RP',desc: 'Elite practitioners only' },
};

export default function ManageBountiesPage() {
  const router = useRouter();
  const [userId, setUserId]         = useState<number | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [balance, setBalance]       = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rewardAmount: '',
    experienceLevel: 'Junior',
    requiredSkill: '',
    dueDate: '',
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.user.role === 'Corporate') {
          setUserId(data.user.userId);
          // Fetch balance for the funds display
          fetch(`/api/dashboard/corporate?id=${data.user.userId}`)
            .then(r => r.json())
            .then(d => { if (d.success) setBalance(parseFloat(d.data.Fiat_Balance || 0)); })
            .catch(() => {});
        } else {
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setAuthLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) return;
    setFormLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corporateUserId: userId, ...formData }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setFormData({ title: '', description: '', rewardAmount: '', experienceLevel: 'Junior', requiredSkill: '', dueDate: '' });
        // Refresh balance
        fetch(`/api/dashboard/corporate?id=${userId}`)
          .then(r => r.json())
          .then(d => { if (d.success) setBalance(parseFloat(d.data.Fiat_Balance || 0)); })
          .catch(() => {});
      } else {
        setError(json.error || 'Failed to post bounty');
      }
    } catch {
      setError('An unexpected network error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  const selectedLevel = LEVEL_CONFIG[formData.experienceLevel];
  const reward = parseFloat(formData.rewardAmount);
  const canAfford = balance !== null && !isNaN(reward) && reward > 0 && balance >= reward;

  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm animate-pulse">
      Verifying credentials…
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <TopNav role="Corporate" />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 w-full py-10 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">← Back to Dashboard</Link>
            <h1 className="text-2xl font-bold tracking-tight mt-1">Post New Bounty</h1>
            <p className="text-slate-400 text-sm mt-0.5">Your funds are reserved and only released when you approve the work.</p>
          </div>
          <Link
            href="/dashboard/bounty-history"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Bounty History
          </Link>
        </div>

        {/* Balance chip */}
        {balance !== null && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm">
            <span className="text-slate-500">Available balance:</span>
            <span className="font-bold text-emerald-400">${balance.toFixed(2)}</span>
            {formData.rewardAmount && !isNaN(reward) && reward > 0 && (
              <>
                <span className="text-slate-700 mx-1">→</span>
                <span className="text-slate-500">After posting:</span>
                <span className={`font-bold ${canAfford ? 'text-slate-300' : 'text-red-400'}`}>
                  ${canAfford ? (balance - reward).toFixed(2) : 'Insufficient funds'}
                </span>
              </>
            )}
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-semibold">Bounty posted successfully!</p>
              <p className="text-emerald-500/80 text-xs mt-0.5">Your funds are reserved and the bounty is now live on the board.</p>
            </div>
            <Link href="/dashboard/bounty-history" className="ml-auto text-emerald-400 hover:underline text-xs shrink-0">View History →</Link>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Form card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Bounty Title</label>
              <input
                type="text" required
                placeholder="e.g., Build a React authentication flow"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Description & Requirements</label>
              <textarea
                required rows={5}
                placeholder="List acceptance criteria, expected submission format, and any technical constraints…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm resize-none"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Reward + Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">Reward Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <input
                    type="number" required step="0.01" min="1"
                    placeholder="150.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm"
                    value={formData.rewardAmount}
                    onChange={e => setFormData({ ...formData, rewardAmount: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">Talent Level</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                  value={formData.experienceLevel}
                  onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })}
                >
                  <option value="Junior">Junior</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Level info */}
            <div className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg flex items-center gap-2 text-xs">
              <span className={`font-bold ${selectedLevel.color}`}>{formData.experienceLevel}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{selectedLevel.rp} required</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">{selectedLevel.desc}</span>
            </div>

            {/* Skill + Due date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">Required Skill Domain</label>
                <select
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                  value={formData.requiredSkill}
                  onChange={e => setFormData({ ...formData, requiredSkill: e.target.value })}
                >
                  <option value="" disabled>Select domain…</option>
                  {PLATFORM_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">Due Date</label>
                <input
                  type="date" required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm"
              >
                {formLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Reserving Funds…
                  </>
                ) : (
                  'Publish & Reserve Funds'
                )}
              </button>
              <p className="text-center text-xs text-slate-600 mt-2">
                Funds are deducted from your balance and held securely until you approve the submitted work.
              </p>
            </div>

          </form>
        </div>

      </main>
    </div>
  );
}
