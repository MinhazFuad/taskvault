'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChatPage() {
  const router   = useRouter();
  const params   = useParams();
  const bountyId = params.bountyId as string;

  const [role,     setRole]     = useState<string>('');
  const [userId,   setUserId]   = useState<number | null>(null);
  const [bounty,   setBounty]   = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [content,  setContent]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef   = useRef<number | null>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = async (uid: number) => {
    try {
      const res  = await fetch(`/api/messages?bountyId=${bountyId}&userId=${uid}&_t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setBounty(json.bounty);
        setMessages(json.messages);
      } else {
        setError(json.error || 'Failed to load messages.');
      }
    } catch { /* silent on poll failures */ }
  };

  useEffect(() => {
    (async () => {
      try {
        const auth = await fetch('/api/auth/me').then(r => r.json());
        if (!auth.success) { router.push('/login'); return; }
        if (!['Student', 'Corporate'].includes(auth.user.role)) { router.push('/dashboard'); return; }

        const uid = auth.user.userId;
        setUserId(uid);
        userIdRef.current = uid;
        setRole(auth.user.role);

        await fetchMessages(uid);
        setLoading(false);

        intervalRef.current = setInterval(() => {
          if (userIdRef.current) fetchMessages(userIdRef.current);
        }, 3000);
      } catch {
        setError('Network error.');
        setLoading(false);
      }
    })();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bountyId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isActive = bounty && ['Assigned', 'Under_Review'].includes(bounty.Status);

  const handleSend = async () => {
    if (!userId || !content.trim() || sending || !isActive) return;
    setSending(true);
    try {
      const res  = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bountyId: parseInt(bountyId), senderId: userId, content: content.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setContent('');
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
        }
        await fetchMessages(userId);
      }
    } catch { /* silent */ }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date label
  const groupedMessages: { date: string; msgs: any[] }[] = [];
  for (const msg of messages) {
    const label = formatDateLabel(msg.Created_At);
    const last  = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === label) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date: label, msgs: [msg] });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col text-white">
        <TopNav role={(role as any) || 'Student'} />
        <div className="flex-1 flex items-center justify-center text-slate-500 animate-pulse text-sm">
          Loading conversation…
        </div>
      </div>
    );
  }

  if (error || !bounty) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col text-white">
        <TopNav role={(role as any) || 'Student'} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-red-400 font-semibold">{error || 'Conversation not found.'}</p>
          <Link href="/dashboard/messages" className="text-blue-400 text-sm hover:underline">← Back to Messages</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <TopNav role={role as any} />

      <div className="flex flex-col max-w-3xl w-full mx-auto px-4 sm:px-6 py-4" style={{ height: 'calc(100vh - 64px)' }}>

        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-t-2xl px-5 py-3.5 flex items-center gap-3 shrink-0">
          <Link href="/dashboard/messages" className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
            {(bounty.Other_Party_Name || '?').charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">{bounty.Other_Party_Name || 'Unknown'}</p>
            <p className="text-slate-500 text-xs truncate">{bounty.Title}</p>
          </div>

          <div className="shrink-0">
            {isActive ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-500">Archived</span>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 bg-slate-950 border-x border-slate-800 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-3xl">👋</p>
              <p className="text-slate-400 font-semibold text-sm">Start the conversation</p>
              <p className="text-slate-600 text-xs">Messages about this bounty will appear here.</p>
            </div>
          ) : (
            groupedMessages.map(group => (
              <div key={group.date} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-[10px] text-slate-600 font-semibold px-2">{group.date}</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {group.msgs.map(msg => {
                  const isOwn = msg.Sender_ID === userId;
                  return (
                    <div key={msg.Message_ID} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isOwn && (
                        <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 text-[10px] font-bold shrink-0 mb-0.5">
                          {(msg.Sender_Name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`max-w-[75%] space-y-1 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
                        }`}>
                          {msg.Content}
                        </div>
                        <p className="text-[10px] text-slate-600 px-1">{formatTime(msg.Created_At)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="bg-slate-900 border border-slate-800 border-t-0 rounded-b-2xl px-4 py-3 shrink-0">
          {isActive ? (
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none placeholder:text-slate-600 leading-relaxed"
                style={{ minHeight: '42px', maxHeight: '128px' }}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                }}
              />
              <button
                type="button"
                disabled={!content.trim() || sending}
                onClick={handleSend}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                {sending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-slate-600 text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              This bounty is complete — conversation is archived and read-only
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
