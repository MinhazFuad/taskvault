'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

const STATUS_TABS = ['All', 'Pending', 'Interview_Called', 'Email_Inquiry', 'Rejected', 'Approved'];

const STATUS_STYLE: Record<string, string> = {
  Pending:         'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
  Interview_Called:'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  Email_Inquiry:   'bg-blue-500/10 text-blue-400 border-blue-500/25',
  Rejected:        'bg-red-500/10 text-red-400 border-red-500/25',
  Approved:        'bg-purple-500/10 text-purple-400 border-purple-500/25',
};

const STATUS_LABEL: Record<string, string> = {
  Pending:         'Pending Review',
  Interview_Called:'Interview Invited',
  Email_Inquiry:   'Email Inquiry Sent',
  Rejected:        'Rejected',
  Approved:        'Approved',
};

type Application = {
  Application_ID: number;
  Status: string;
  Admin_Feedback: string | null;
  Applied_At: string;
  Updated_At: string;
  Student_User_ID: number;
  Student_Name: string;
  Student_Email: string;
  Student_Role: string;
  Rep_Points: number;
  Avg_Rating: number;
  Rating_Count: number;
  Bounties_Done: number;
};

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    app: Application;
    action: 'Interview_Called' | 'Rejected' | 'Email_Inquiry';
  } | null>(null);
  const [modalMessage, setModalMessage] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/applications?status=${statusFilter}&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setApplications(json.data);
    } catch {}
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(j => {
      if (!j.success || j.user.role !== 'Admin') router.push('/dashboard');
    });
  }, [router]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const openModal = (app: Application, action: 'Interview_Called' | 'Rejected' | 'Email_Inquiry') => {
    setModal({ app, action });
    setModalMessage('');
    setModalError('');
  };

  const handleAction = async () => {
    if (!modal) return;
    if (modal.action === 'Email_Inquiry' && !modalMessage.trim()) {
      setModalError('Please write a message for the email inquiry.');
      return;
    }
    setModalLoading(true);
    setModalError('');
    try {
      const res = await fetch(`/api/admin/applications/${modal.app.Application_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: modal.action, message: modalMessage.trim() || null }),
      });
      const json = await res.json();
      if (json.success) {
        setModal(null);
        await fetchApplications();
      } else {
        setModalError(json.error || 'Action failed.');
      }
    } catch {
      setModalError('Network error.');
    } finally {
      setModalLoading(false);
    }
  };

  const pendingCount = applications.filter(a => a.Status === 'Pending').length;

  const MODAL_CONFIG = {
    Interview_Called: {
      title: 'Call for Interview',
      icon: '🎤',
      desc: 'This will notify the student that they\'ve been selected for an instructor interview. You can optionally include scheduling details.',
      btnLabel: 'Send Interview Invitation',
      btnClass: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30',
      messageLabel: 'Interview Details (optional)',
      messagePlaceholder: 'e.g. Interview scheduled for Monday, June 12 at 3PM via Google Meet…',
      messageRequired: false,
    },
    Email_Inquiry: {
      title: 'Send Email Inquiry',
      icon: '📧',
      desc: 'Write a message that will be shown to the student as a follow-up inquiry. They will also be prompted to check their email inbox.',
      btnLabel: 'Send Inquiry',
      btnClass: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30',
      messageLabel: 'Message to student (required)',
      messagePlaceholder: "e.g. We'd like to know more about your experience with X. Please reply to this email with…",
      messageRequired: true,
    },
    Rejected: {
      title: 'Reject Application',
      icon: '✕',
      desc: 'The student will be notified that their application was not successful. You can optionally include feedback.',
      btnLabel: 'Confirm Rejection',
      btnClass: 'bg-red-600 hover:bg-red-500 shadow-red-900/30',
      messageLabel: 'Reason / Feedback (optional)',
      messagePlaceholder: 'e.g. We appreciate your application but the current rating threshold has not been met…',
      messageRequired: false,
    },
  } as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Admin" />

      {/* ACTION MODAL */}
      {modal && (() => {
        const cfg = MODAL_CONFIG[modal.action];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 max-w-lg w-full shadow-2xl space-y-5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cfg.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{cfg.title}</h3>
                    <p className="text-slate-400 text-sm mt-0.5">{modal.app.Student_Name}</p>
                  </div>
                </div>
                <button onClick={() => setModal(null)} className="text-slate-500 hover:text-white text-xl">✕</button>
              </div>

              <p className="text-slate-400 text-sm bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">{cfg.desc}</p>

              {modalError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">{modalError}</div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {cfg.messageLabel}
                </label>
                <textarea
                  rows={4}
                  placeholder={cfg.messagePlaceholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  value={modalMessage}
                  onChange={e => setModalMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold">
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={modalLoading}
                  className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-50 shadow-lg ${cfg.btnClass}`}
                >
                  {modalLoading ? 'Processing…' : cfg.btnLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link href="/dashboard" className="text-red-400 text-sm hover:underline mb-2 inline-block">&larr; Back to Control Panel</Link>
            <h1 className="text-3xl font-bold tracking-tight">Instructor Applications</h1>
            <p className="text-slate-400 text-sm mt-1">Review and respond to students applying to become instructors.</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 px-5 py-3 rounded-xl text-center">
              <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">Awaiting Review</p>
              <p className="text-2xl font-extrabold text-yellow-400">{pendingCount}</p>
            </div>
          )}
        </div>

        {/* FILTER TABS */}
        <div className="flex gap-1 bg-slate-900/80 border border-slate-700 p-1 rounded-xl w-fit">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              {s === 'Email_Inquiry' ? 'Email Inquiry' : s === 'Interview_Called' ? 'Interview' : s}
            </button>
          ))}
        </div>

        {/* APPLICATION CARDS */}
        {loading ? (
          <div className="text-slate-400 text-center py-16 animate-pulse font-medium">Loading applications…</div>
        ) : applications.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-400">No applications found.</p>
            <p className="text-sm mt-1">
              {statusFilter === 'All' ? 'No students have applied yet.' : `No applications with status "${STATUS_LABEL[statusFilter] || statusFilter}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(app => (
              <div
                key={app.Application_ID}
                className={`bg-slate-800/70 border rounded-2xl p-6 shadow-lg transition-all ${
                  app.Status === 'Pending' ? 'border-yellow-500/20' :
                  app.Status === 'Interview_Called' ? 'border-emerald-500/20' :
                  app.Status === 'Email_Inquiry' ? 'border-blue-500/20' :
                  app.Status === 'Approved' ? 'border-purple-500/20' :
                  'border-slate-700/50 opacity-70'
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-6">

                  {/* STUDENT INFO */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-extrabold text-white shrink-0">
                          {app.Student_Name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{app.Student_Name}</h3>
                          <p className="text-sm text-slate-400 font-mono">{app.Student_Email}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider ${STATUS_STYLE[app.Status] || ''}`}>
                        {STATUS_LABEL[app.Status] || app.Status}
                      </span>
                    </div>

                    {/* STATS ROW */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Rep Points</p>
                        <p className={`text-xl font-extrabold mt-0.5 ${Number(app.Rep_Points) >= 3000 ? 'text-blue-400' : 'text-red-400'}`}>
                          {Number(app.Rep_Points).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-0.5">need 2,000+</p>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Avg Rating</p>
                        <p className={`text-xl font-extrabold mt-0.5 ${Number(app.Avg_Rating) >= 4.8 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {Number(app.Avg_Rating).toFixed(1)}★
                        </p>
                        <p className="text-[9px] text-slate-600 mt-0.5">{app.Rating_Count} reviews</p>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Bounties Done</p>
                        <p className="text-xl font-extrabold mt-0.5 text-emerald-400">{app.Bounties_Done}</p>
                        <p className="text-[9px] text-slate-600 mt-0.5">completed</p>
                      </div>
                    </div>

                    {/* TIMELINE */}
                    <div className="flex gap-4 text-xs text-slate-500 font-medium">
                      <span>Applied: <span className="text-slate-400">{new Date(app.Applied_At).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></span>
                      {app.Status !== 'Pending' && (
                        <span>Updated: <span className="text-slate-400">{new Date(app.Updated_At).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></span>
                      )}
                    </div>

                    {/* ADMIN FEEDBACK (if reviewed) */}
                    {app.Admin_Feedback && (
                      <div className={`rounded-xl p-3 border text-sm ${
                        app.Status === 'Interview_Called' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' :
                        app.Status === 'Email_Inquiry'   ? 'bg-blue-500/5 border-blue-500/20 text-blue-300' :
                        'bg-slate-900/50 border-slate-800 text-slate-400'
                      }`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">Admin Note</p>
                        {app.Admin_Feedback}
                      </div>
                    )}
                  </div>

                  {/* ACTIONS */}
                  {app.Status === 'Pending' && (
                    <div className="flex lg:flex-col gap-2 justify-end lg:justify-start lg:w-44 shrink-0">
                      <button
                        onClick={() => openModal(app, 'Interview_Called')}
                        className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-900/30 text-center"
                      >
                        🎤 Call for Interview
                      </button>
                      <button
                        onClick={() => openModal(app, 'Email_Inquiry')}
                        className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-blue-900/30 text-center"
                      >
                        📧 Email Inquiry
                      </button>
                      <button
                        onClick={() => openModal(app, 'Rejected')}
                        className="flex-1 lg:flex-none bg-slate-700 hover:bg-slate-600 border border-red-500/20 text-red-400 hover:text-red-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all text-center"
                      >
                        Reject
                      </button>

                      {/* Promote shortcut */}
                      <div className="hidden lg:block pt-2 border-t border-slate-700 mt-1">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-1.5">After interview</p>
                        <Link
                          href="/dashboard/admin/users"
                          className="block w-full text-center bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 font-bold px-3 py-2 rounded-xl text-[10px] transition-all"
                        >
                          Promote via User Mgmt →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* POST-REVIEW: promote shortcut for interviewed candidates */}
                  {app.Status === 'Interview_Called' && (
                    <div className="flex lg:flex-col gap-2 justify-end lg:w-44 shrink-0">
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center space-y-2">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Ready to promote?</p>
                        <Link
                          href="/dashboard/admin/users"
                          className="block bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-bold px-3 py-2 rounded-lg text-xs transition-all"
                        >
                          Change Role → Instructor
                        </Link>
                        <p className="text-[9px] text-slate-600">via User Management</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
