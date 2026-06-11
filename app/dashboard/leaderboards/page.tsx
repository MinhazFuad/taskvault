'use client';

import { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

export default function LeaderboardsPage() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const authRes = await fetch('/api/auth/me');
        const authJson = await authRes.json();
        if (authJson.success) {
          setCurrentUserId(authJson.user.userId);
        }

        const res = await fetch(`/api/leaderboards?t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();

        if (json.success) {
          setLeaders(json.data);
        } else {
          setError(json.error || 'Failed to load leaderboards.');
        }
      } catch (err) {
        setError('Network error loading competitive ladder.');
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div>
          <Link href="/dashboard" className="text-blue-400 text-sm hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link>
          <h1 className="text-3xl font-bold tracking-tight">Global Skill Tier Leaderboard</h1>
          <p className="text-slate-400 text-sm mt-1">Climb the ranks by accumulating Reputation Points and securing Advanced execution tiers.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center font-semibold text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 py-16 text-center animate-pulse font-medium">Compiling global scholar standings...</div>
        ) : leaders.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500">
            No student metrics registered on the network yet.
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* PODIUM: TOP 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {leaders.slice(0, 3).map((student, index) => {
                const isMe = student.User_ID === currentUserId;
                const rankColors = [
                  'border-amber-500/50 bg-amber-500/10 text-amber-400 shadow-amber-500/10', // 1st Gold
                  'border-slate-400/50 bg-slate-400/10 text-slate-300 shadow-slate-400/10', // 2nd Silver
                  'border-amber-700/50 bg-amber-700/10 text-amber-600 shadow-amber-700/10'  // 3rd Bronze
                ];
                const medals = ['Top Talent', 'Elite executioner', 'Proven Specialist'];

                return (
                  <div 
                    key={student.User_ID} 
                    className={`rounded-2xl p-6 border shadow-xl flex flex-col justify-between relative overflow-hidden backdrop-blur-sm ${
                      rankColors[index]
                    } ${index === 0 ? 'md:-translate-y-4' : ''}`}
                  >
                    {isMe && (
                      <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-extrabold px-3 py-1 rounded-bl-lg tracking-wider uppercase">
                        You
                      </div>
                    )}
                    <div className="space-y-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 opacity-80">
                        <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        Rank #{index + 1} • {medals[index]}
                      </span>
                      <h3 className="text-xl font-bold tracking-tight text-white">{student.Full_Name}</h3>
                      <p className="text-xs font-semibold opacity-90">{student.Skill_Level} Tier</p>
                    </div>

                    <div className="pt-6 border-t border-current/20 flex justify-between items-end mt-4">
                      <div>
                        <span className="text-[10px] block opacity-75 font-medium">Bounties Executed</span>
                        <span className="text-2xl font-extrabold block">{student.Total_Bounties_Completed}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] block opacity-75 font-medium">Total RP</span>
                        <span className="text-lg font-bold block">{student.Available_Rep_Points}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FULL LADDER LIST */}
            <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700 grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-2">Rank</div>
                <div className="col-span-5">Scholar Profile</div>
                <div className="col-span-3 text-center">Completed Tasks</div>
                <div className="col-span-2 text-right">Reputation</div>
              </div>

              <div className="divide-y divide-slate-700/50">
                {leaders.map((student, index) => {
                  const isMe = student.User_ID === currentUserId;

                  return (
                    <div 
                      key={student.User_ID} 
                      className={`px-6 py-4 grid grid-cols-12 items-center text-sm transition-colors ${
                        isMe ? 'bg-blue-600/20 font-semibold' : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <div className="col-span-2 flex items-center gap-2 font-mono">
                        <span className="text-slate-500">#</span>
                        <span className={index < 3 ? 'font-bold text-amber-400' : 'text-slate-300'}>
                          {index + 1}
                        </span>
                      </div>

                      <div className="col-span-5">
                        <div className="flex items-center gap-2">
                          <span className="text-white truncate">{student.Full_Name}</span>
                          {isMe && <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">YOU</span>}
                        </div>
                        <span className={`text-xs block font-semibold ${
                          student.Skill_Level === 'Advanced' ? 'text-purple-400' : 
                          student.Skill_Level === 'Intermediate' ? 'text-blue-400' : 'text-emerald-400'
                        }`}>
                          {student.Skill_Level}
                        </span>
                      </div>

                      <div className="col-span-3 text-center font-mono font-bold text-slate-300">
                        {student.Total_Bounties_Completed}
                      </div>

                      <div className="col-span-2 text-right font-mono font-bold text-blue-400">
                        {student.Available_Rep_Points} RP
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}