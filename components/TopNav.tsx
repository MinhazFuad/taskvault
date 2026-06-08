'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const NOTIF_ICONS: Record<string, string> = {
  new_application:     '📥',
  application_accepted:'✅',
  application_rejected:'❌',
  submission_received: '📨',
  payment_released:    '💰',
  bounty_expiring:     '⏰',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TopNav({ role }: { role: 'Student' | 'Corporate' | 'Instructor' | 'Admin' }) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userProfile,  setUserProfile]  = useState<any>(null);
  const [userId,       setUserId]        = useState<number | null>(null);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [notifications,setNotifications]= useState<any[]>([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    router.push('/login');
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user profile + notifications
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const authRes  = await fetch('/api/auth/me');
        const authJson = await authRes.json();

        if (authJson.success) {
          const uid = authJson.user.userId;
          setUserId(uid);

          if (authJson.user.role === 'Student') {
            const profRes  = await fetch(`/api/profile?id=${uid}`);
            const profJson = await profRes.json();
            if (profJson.success) setUserProfile(profJson.data);
          } else {
            setUserProfile({ Full_Name: authJson.user.fullName });
          }

          // Load notifications
          const notifRes  = await fetch(`/api/notifications?userId=${uid}`);
          const notifJson = await notifRes.json();
          if (notifJson.success) {
            setNotifications(notifJson.data || []);
            setUnreadCount(notifJson.unreadCount || 0);
          }
        }
      } catch (err) {
        console.error('Failed to load nav data', err);
      }
    };
    fetchUser();
  }, []);

  const openNotif = async () => {
    setNotifOpen(v => !v);
    setDropdownOpen(false);
  };

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    await fetch('/api/notifications/read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, Is_Read: 1 })));
    setUnreadCount(0);
  };

  const handleNotifClick = async (notif: any) => {
    if (!notif.Is_Read && userId) {
      await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId: notif.Notification_ID }),
      });
      setNotifications(prev => prev.map(n => n.Notification_ID === notif.Notification_ID ? { ...n, Is_Read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setNotifOpen(false);
    if (notif.Link) router.push(notif.Link);
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight">
              Task<span className="text-blue-400">Vault</span>
            </Link>
            
            <div className="hidden md:flex space-x-4">
              <Link href="/dashboard" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
              
              {/* Explicitly define what each role sees */}
              {role === 'Student' && (
                <>
                  <Link href="/dashboard/courses" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">LMS Courses</Link>
                  <Link href="/dashboard/bounties" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Bounty Board</Link>
                  <Link href="/dashboard/leaderboards" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Leaderboards</Link>
                  {/* Profile link was moved to the avatar dropdown */}
                </>
              )}

              {role === 'Corporate' && (
                <>
                  <Link href="/dashboard/manage-bounties" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Post Bounty</Link>
                  <Link href="/dashboard/bounty-history" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Bounty History</Link>
                  <Link href="/dashboard/submissions" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Review Studio</Link>
                </>
              )}

              {role === 'Instructor' && (
                <>
                  <Link href="/dashboard/create-course" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Course Builder</Link>
                </>
              )}

              {role === 'Admin' && (
                <>
                  <Link href="/dashboard/admin/users" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Manage Users</Link>
                  <Link href="/dashboard/admin/applications" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Applications</Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border hidden sm:block ${role === 'Admin' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
              {role === 'Admin' ? '⚡ Admin' : `${role} View`}
            </span>

            {/* NOTIFICATION BELL */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={openNotif}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-800/80">
                    <p className="text-sm font-bold text-white">Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/40">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500 text-xs">No notifications yet</div>
                    ) : (
                      notifications.map(n => (
                        <button
                          key={n.Notification_ID}
                          onClick={() => handleNotifClick(n)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors ${!n.Is_Read ? 'bg-blue-500/5' : ''}`}
                        >
                          <span className="text-base shrink-0 mt-0.5">{NOTIF_ICONS[n.Type] || '🔔'}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold leading-snug ${!n.Is_Read ? 'text-white' : 'text-slate-300'}`}>
                              {n.Title}
                            </p>
                            {n.Body && <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.Body}</p>}
                            <p className="text-[9px] text-slate-600 mt-1">{timeAgo(n.Created_At)}</p>
                          </div>
                          {!n.Is_Read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* MODERN PROFILE AVATAR DROPDOWN */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 hover:border-blue-500 transition-all overflow-hidden focus:outline-none shadow-lg"
              >
                {userProfile?.Profile_Picture ? (
                  <img src={userProfile.Profile_Picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-300 font-bold text-sm uppercase">
                    {userProfile?.Full_Name ? userProfile.Full_Name.charAt(0) : role.charAt(0)}
                  </span>
                )}
              </button>

              {/* DROPDOWN MENU */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 overflow-hidden origin-top-right animate-in fade-in slide-in-from-top-2 duration-200">
                  
                  {/* User Identifier Header */}
                  {userProfile?.Full_Name && (
                     <div className="px-4 py-3 border-b border-slate-700/50 mb-1 bg-slate-800/50">
                       <p className="text-sm font-bold text-white truncate">{userProfile.Full_Name}</p>
                       {userProfile?.Username && <p className="text-xs text-blue-400 font-mono mt-0.5 truncate">@{userProfile.Username}</p>}
                     </div>
                  )}

                  {/* Contextual Links */}
                  {role === 'Student' && (
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span>👤</span> My Profile
                    </Link>
                  )}

                  {role === 'Admin' && (
                    <Link
                      href="/dashboard/admin/users"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span>⚡</span> User Management
                    </Link>
                  )}
                  
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </nav>
  );
}