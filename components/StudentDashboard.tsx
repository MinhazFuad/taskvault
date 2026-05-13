'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StudentDashboard({ userId }: { userId: number }) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch(`/api/dashboard/student?id=${userId}&t=${Date.now()}`, {
          cache: 'no-store'
        });
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Database response error. Check XAMPP.");
        }

        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to fetch dashboard metrics");

        setDashboardData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [userId]);

  if (loading) return <div className="p-6 text-slate-400 text-center text-xl animate-pulse font-medium">Accessing Vault...</div>;
  if (error) return <div className="p-6 text-red-400 text-center font-bold">Error: {error}</div>;

  const metrics = dashboardData;
  const bounties = dashboardData?.bounties || [];
  const activeBounties = bounties.filter((b: any) => b.Status === 'Assigned' || b.Status === 'Under_Review');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {metrics?.Full_Name}</h1>
        <Link 
          href="/dashboard/my-bounties" 
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all text-sm"
        >
          Go to Execution Studio &rarr;
        </Link>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Reputation Points</h3>
          <p className="text-3xl font-extrabold text-blue-400 mt-2">{metrics?.Available_Rep_Points || 0} RP</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">RP at Stake (Locked)</h3>
          <p className="text-3xl font-extrabold text-orange-400 mt-2">{metrics?.Locked_RP || 0} RP</p>
          <p className="text-[10px] text-slate-500 mt-1">Committed in active claims</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Global Rank</h3>
          <p className="text-3xl font-extrabold text-purple-400 mt-2">{metrics?.Global_Elo_Rank || 'Unranked'}</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Wallet Balance</h3>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">${parseFloat(metrics?.Fiat_Balance || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* CLAIMED BOUNTIES LEDGER */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Active Task Escrows</h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
            {activeBounties.length} Tasks Claimed
          </span>
        </div>

        {activeBounties.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl space-y-2">
            <p className="font-semibold text-slate-400">No bounties claimed yet.</p>
            <p className="text-sm">Head over to the Bounty Board to claim an escrow and start earning capital.</p>
            <Link href="/dashboard/bounties" className="text-blue-400 text-xs font-bold hover:underline block pt-2">
              Browse Public Board &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeBounties.map((bounty: any) => (
              <div key={bounty.Bounty_ID} className="bg-slate-900/80 border border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {bounty.Company_Name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      bounty.Status === 'Assigned' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      bounty.Status === 'Under_Review' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {bounty.Status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white tracking-tight">{bounty.Title}</h3>
                </div>

                <div className="flex justify-between items-center bg-slate-800/40 p-3 rounded-lg border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Escrow Value</span>
                    <span className="font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">RP at Stake</span>
                    <span className="font-bold text-blue-400">{bounty.Required_RP} RP</span>
                  </div>
                </div>

                <Link 
                  href="/dashboard/my-bounties" 
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold py-2 rounded-lg text-center transition-all border border-slate-700 block"
                >
                  {bounty.Status === 'Assigned' ? 'Submit Deliverables &rarr;' : 'View Submission Status'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}