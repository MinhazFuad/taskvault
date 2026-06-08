'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

const STATUS_INFO: Record<string, {
  icon: ReactNode;
  color: string;
  border: string;
  title: string;
  body: (msg?: string) => string;
}> = {
  Pending: {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-yellow-500/5',
    border: 'border-yellow-500/30',
    title: 'Application Under Review',
    body: () => 'Your application has been submitted and is currently being reviewed by the admin team. This usually takes a few business days.',
  },
  Interview_Called: {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    color: 'bg-emerald-500/5',
    border: 'border-emerald-500/35',
    title: 'Interview Invitation!',
    body: (msg) => msg || 'Congratulations! You have been selected for an instructor interview. The admin team will reach out with further scheduling details.',
  },
  Email_Inquiry: {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: 'bg-blue-500/5',
    border: 'border-blue-500/30',
    title: 'Check Your Email',
    body: (msg) => msg || 'The admin team has sent a follow-up inquiry to your registered email address. Please check your inbox and reply promptly.',
  },
  Approved: {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
      </svg>
    ),
    color: 'bg-purple-500/5',
    border: 'border-purple-500/35',
    title: 'Application Approved!',
    body: (msg) => msg || 'Your instructor application has been approved. The admin team will update your account role shortly. Welcome to the teaching team!',
  },
  Rejected: {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
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
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0 text-purple-400">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
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
                <span className={`text-slate-300`}>{info.icon}</span>
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
            <span className="text-emerald-400 shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <p className="text-emerald-300 text-sm font-semibold">Application submitted successfully! We will review your profile and respond shortly.</p>
          </div>
        )}

        {/* WHAT INSTRUCTORS DO */}
        <section className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-white">What Instructors Do</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
                title: 'Create Courses', 
                desc: 'Build multi-module courses with rich content and video links tailored to your area of expertise.' 
              },
              { 
                icon: (
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <circle cx="12" cy="12" r="6" strokeWidth="2" />
                    <circle cx="12" cy="12" r="2" strokeWidth="2" />
                  </svg>
                ),
                title: 'Define Skills', 
                desc: 'Each course awards students a specific skill badge they can use to qualify for relevant corporate bounties.' 
              },
              { 
                icon: (
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                ),
                title: 'Shape Talent', 
                desc: 'Students completing your course earn RP and unlock new bounty tiers, directly improving their earning potential.' 
              },
            ].map(item => (
              <div key={item.title} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <span className="block mb-3">{item.icon}</span>
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
              <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Eligible
              </span>
            )}
          </div>

          {/* RP Requirement */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className={`shrink-0 ${eligibility?.meetsRp ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {eligibility?.meetsRp ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    </svg>
                  )}
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
                <span className={`shrink-0 ${eligibility?.meetsRating ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {eligibility?.meetsRating ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    </svg>
                  )}
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
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 mt-2"
                >
                  {applying ? 'Submitting Application…' : (
                    <>
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                      </svg>
                      Submit Instructor Application
                    </>
                  )}
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