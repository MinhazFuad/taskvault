'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

const STATUS_INFO: Record<string, {
  icon: string;
  color: string;
  border: string;
  title: string;
  body: (msg?: string) => string;
}> = {
  Pending: {
    icon: '⏳',
    color: 'bg-yellow-500/5',
    border: 'border-yellow-500/30',
    title: 'Application Under Review',
    body: () => 'Your application has been submitted and is currently being reviewed by the admin team. This usually takes a few business days.',
  },
  Interview_Called: {
    icon: '🎤',
    color: 'bg-emerald-500/5',
    border: 'border-emerald-500/35',
    title: 'Interview Invitation!',
    body: (msg) => msg || 'Congratulations! You have been selected for an instructor interview. The admin team will reach out with further scheduling details.',
  },
  Email_Inquiry: {
    icon: '📧',
    color: 'bg-blue-500/5',
    border: 'border-blue-500/30',
    title: 'Check Your Email',
    body: (msg) => msg || 'The admin team has sent a follow-up inquiry to your registered email address. Please check your inbox and reply promptly.',
  },
  Approved: {
    icon: '🎓',
    color: 'bg-purple-500/5',
    border: 'border-purple-500/35',
    title: 'Application Approved!',
    body: (msg) => msg || 'Your instructor application has been approved. The admin team will update your account role shortly. Welcome to the teaching team!',
  },
  Rejected: {
    icon: '✕',
    color: 'bg-slate-900/40',
    border: 'border-slate-700',
    title: 'Application Not Approved',
    body: (msg) => msg || 'Your application was not successful at this time. Keep building your reputation and you can reapply once you meet the requirements again.',
  },
};

export default function InstructorApplyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [applyData, setApplyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  const fetchData = async (id: number) => {
    try {
      const res = await fetch(`/api/instructor-apply?studentId=${id}&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setApplyData(json.data);
    } catch {}
  };

  useEffect(() => {
    async function init() {
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();
      if (!authJson.success || authJson.user.role !== 'Student') {
        router.push('/dashboard');
        return;
      }
      const id = authJson.user.userId;
      setUserId(id);
      await fetchData(id);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleApply = async () => {
    if (!userId) return;
    setApplyError('');
    setApplying(true);
    try {
      const res = await fetch('/api/instructor-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: userId }),
      });
      const json = await res.json();
      if (json.success) {
        setApplySuccess(true);
        await fetchData(userId);
      } else {
        setApplyError(json.error || 'Application failed. Please try again.');
      }
    } catch {
      setApplyError('Network error. Please check your connection.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
        <TopNav role="Student" />
        <div className="flex-1 flex items-center justify-center text-slate-400 animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  const eligibility  = applyData?.eligibility;
  const application  = applyData?.application;
  const isEligible   = eligibility?.meetsRp && eligibility?.meetsRating;
  const hasActive    = application && application.Status !== 'Rejected' && application.Status !== 'Approved';
  const canReapply   = application?.Status === 'Rejected' && isEligible;

  const rpPct     = Math.min(((eligibility?.rp || 0) / 3000) * 100, 100);
  const ratingPct = Math.min(((eligibility?.rating || 0) / 4.8) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">

        {/* BACK + HEADER */}
        <div>
          <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm font-medium transition-colors inline-flex items-center gap-1.5 mb-5">
            ← Back to Dashboard
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-2xl shrink-0">
              🎓
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Instructor Program</h1>
              <p className="text-slate-400 text-sm mt-1">
                Share your expertise. Create courses. Earn reputation on the platform.
              </p>
            </div>
          </div>
        </div>

        {/* APPLICATION STATUS CARD — shown if they have an application */}
        {application && (() => {
          const info = STATUS_INFO[application.Status] || STATUS_INFO.Rejected;
          return (
            <div className={`rounded-2xl border p-6 space-y-4 ${info.color} ${info.border}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{info.icon}</span>
                <div>
                  <h2 className="text-lg font-bold text-white">{info.title}</h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Applied {new Date(application.Applied_At).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {application.Status !== 'Pending' && (
                      <> · Updated {new Date(application.Updated_At).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</>
                    )}
                  </p>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {info.body(application.Admin_Feedback)}
              </p>
              {application.Status === 'Interview_Called' && application.Admin_Feedback && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4">
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1.5">Details from Admin</p>
                  <p className="text-emerald-300 text-sm leading-relaxed">{application.Admin_Feedback}</p>
                </div>
              )}
              {application.Status === 'Email_Inquiry' && application.Admin_Feedback && (
                <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl p-4">
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1.5">Message from Admin</p>
                  <p className="text-blue-200 text-sm leading-relaxed">{application.Admin_Feedback}</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* SUCCESS TOAST */}
        {applySuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-emerald-400 text-xl">✓</span>
            <p className="text-emerald-300 text-sm font-semibold">Application submitted successfully! We will review your profile and respond shortly.</p>
          </div>
        )}

        {/* WHAT INSTRUCTORS DO */}
        <section className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-white">What Instructors Do</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '📝', title: 'Create Courses', desc: 'Build multi-module courses with rich content and video links tailored to your area of expertise.' },
              { icon: '🎯', title: 'Define Skills', desc: 'Each course awards students a specific skill badge they can use to qualify for relevant corporate bounties.' },
              { icon: '🏆', title: 'Shape Talent', desc: 'Students completing your course earn RP and unlock new bounty tiers, directly improving their earning potential.' },
            ].map(item => (
              <div key={item.title} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <span className="text-2xl block">{item.icon}</span>
                <p className="font-bold text-white text-sm">{item.title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ELIGIBILITY REQUIREMENTS */}
        <section className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Your Progress</h2>
            {isEligible && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                ✓ Eligible
              </span>
            )}
          </div>

          {/* RP Requirement */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className={`text-base ${eligibility?.meetsRp ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {eligibility?.meetsRp ? '✓' : '○'}
                </span>
                <span className="font-semibold text-slate-200">Reputation Points</span>
              </div>
              <span className={`font-bold text-sm ${eligibility?.meetsRp ? 'text-emerald-400' : 'text-slate-400'}`}>
                {(eligibility?.rp || 0).toLocaleString()} / 3,000 RP
              </span>
            </div>
            <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${eligibility?.meetsRp ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${rpPct}%` }}
              />
            </div>
            {!eligibility?.meetsRp && (
              <p className="text-[11px] text-slate-500">
                {(3000 - (eligibility?.rp || 0)).toLocaleString()} more RP needed — complete courses and bounties to earn it.
              </p>
            )}
          </div>

          {/* Rating Requirement */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className={`text-base ${eligibility?.meetsRating ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {eligibility?.meetsRating ? '✓' : '○'}
                </span>
                <span className="font-semibold text-slate-200">Client Rating</span>
              </div>
              <span className={`font-bold text-sm ${eligibility?.meetsRating ? 'text-emerald-400' : 'text-slate-400'}`}>
                {(eligibility?.ratingCount || 0) > 0
                  ? `${(eligibility?.rating || 0).toFixed(1)}★`
                  : 'No ratings yet'
                } / 4.8★
              </span>
            </div>
            <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${eligibility?.meetsRating ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                style={{ width: `${ratingPct}%` }}
              />
            </div>
            {!eligibility?.meetsRating && (
              <p className="text-[11px] text-slate-500">
                {(eligibility?.ratingCount || 0) === 0
                  ? 'Complete bounties to start receiving client ratings.'
                  : `Raise your average by ${(4.8 - (eligibility?.rating || 0)).toFixed(2)}★ by delivering high-quality work.`
                }
              </p>
            )}
          </div>

          {/* Error */}
          {applyError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
              {applyError}
            </div>
          )}

          {/* CTA */}
          {!hasActive && !applySuccess && (
            <>
              {isEligible ? (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 mt-2"
                >
                  {applying ? 'Submitting Application…' : '🎓 Submit Instructor Application'}
                </button>
              ) : (
                <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-center">
                  <p className="text-slate-400 text-sm font-semibold">Meet both requirements above to unlock your application.</p>
                  <div className="flex justify-center gap-3 mt-3">
                    <Link href="/dashboard/courses" className="text-xs text-blue-400 font-bold hover:underline">
                      Browse Courses →
                    </Link>
                    <Link href="/dashboard/bounties" className="text-xs text-emerald-400 font-bold hover:underline">
                      Find Bounties →
                    </Link>
                  </div>
                </div>
              )}
              {canReapply && (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 rounded-xl text-sm transition-all border border-slate-600 disabled:opacity-50"
                >
                  {applying ? 'Submitting…' : 'Reapply'}
                </button>
              )}
            </>
          )}
        </section>

        {/* APPLICATION PROCESS */}
        <section className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-white">Application Process</h2>
          <ol className="space-y-4">
            {[
              { step: '01', title: 'Submit Application', desc: 'Once eligible, submit your application here. The admin team will be notified immediately.' },
              { step: '02', title: 'Profile Review', desc: 'Admins review your RP, client rating, bounty history, and overall platform contribution.' },
              { step: '03', title: 'Interview or Inquiry', desc: 'You may be called for an interview or asked a follow-up question via email before a decision is made.' },
              { step: '04', title: 'Role Upgrade', desc: 'If approved, your account is upgraded to Instructor. You can then access the Course Builder from your dashboard.' },
            ].map(item => (
              <li key={item.step} className="flex gap-4">
                <span className="text-xs font-black text-slate-600 w-8 shrink-0 mt-0.5">{item.step}</span>
                <div>
                  <p className="font-bold text-slate-200 text-sm">{item.title}</p>
                  <p className="text-slate-500 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

      </main>
    </div>
  );
}
