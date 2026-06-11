'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Assigned:     { label: 'Active',       color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  Under_Review: { label: 'Under Review', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  Completed:    { label: 'Completed',    color: 'text-slate-500',  bg: 'bg-slate-700/30',  border: 'border-slate-700' },
};

export default function MessagesInboxPage() {
  const router = useRouter();
  const [role,          setRole]          = useState<string>('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const auth = await fetch('/api/auth/me').then(r => r.json());
        if (!auth.success) { router.push('/login'); return; }
        if (!['Student', 'Corporate'].includes(auth.user.role)) { router.push('/dashboard'); return; }

        setRole(auth.user.role);

        const res  = await fetch(`/api/messages/inbox?userId=${auth.user.userId}`);
        const json = await res.json();
        if (json.success) setConversations(json.data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <TopNav role={role as any || 'Student'} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 w-full py-8 space-y-6">
        <div>
          <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">← Dashboard</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Messages</h1>
          <p className="text-slate-500 text-sm mt-0.5">Conversations from your active and past bounties.</p>
        </div>

        {loading ? (
          <div className="text-slate-500 py-16 text-center animate-pulse text-sm">Loading conversations…</div>
        ) : conversations.length === 0 ? (
          <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-14 text-center space-y-2">
            <svg className="w-12 h-12 text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="text-slate-400 font-semibold">No conversations yet</p>
            <p className="text-slate-600 text-sm">Messages from active bounties will appear here.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden">
            {conversations.map(conv => {
              const badge = STATUS_BADGE[conv.Status] || STATUS_BADGE.Completed;
              return (
                <Link
                  key={conv.Bounty_ID}
                  href={`/dashboard/messages/${conv.Bounty_ID}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
                    {(conv.Other_Party_Name || '?').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-slate-200 text-sm truncate group-hover:text-white transition-colors">
                        {conv.Other_Party_Name}
                      </p>
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.bg} ${badge.color} ${badge.border}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.Title}</p>
                    {conv.Last_Message && (
                      <p className="text-xs text-slate-600 truncate mt-0.5">{conv.Last_Message}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {conv.Last_Message_At && (
                      <p className="text-[10px] text-slate-600">{timeAgo(conv.Last_Message_At)}</p>
                    )}
                    {parseInt(conv.Unread_Count) > 0 && (
                      <span className="w-5 h-5 bg-blue-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                        {parseInt(conv.Unread_Count) > 9 ? '9+' : conv.Unread_Count}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
