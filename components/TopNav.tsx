'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TopNav({ role }: { role: 'Student' | 'Corporate' | 'Instructor' }) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    router.push('/login');
  };

  // Close the dropdown if the user clicks anywhere outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user data to populate the Avatar and Name in the dropdown
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authJson = await authRes.json();
        
        if (authJson.success) {
          if (authJson.user.role === 'Student') {
            // For students, fetch the full profile to get their custom Avatar image
            const profRes = await fetch(`/api/profile?id=${authJson.user.userId}`);
            const profJson = await profRes.json();
            if (profJson.success) {
              setUserProfile(profJson.data);
            }
          } else {
            // Corporate & Instructors just get their base name
             setUserProfile({ Full_Name: authJson.user.fullName });
          }
        }
      } catch (err) {
        console.error("Failed to load user info for navigation", err);
      }
    };
    fetchUser();
  }, []);

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
                  <Link href="/dashboard/manage-bounties" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Manage Bounties</Link>
                  <Link href="/dashboard/submissions" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Review Submissions</Link>
                </>
              )}

              {role === 'Instructor' && (
                <>
                  <Link href="/dashboard/create-course" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Course Builder</Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 hidden sm:block">
              {role} View
            </span>
            
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