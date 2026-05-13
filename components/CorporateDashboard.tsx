'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CorporateDashboard({ userId }: { userId: number }) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deposit form states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`/api/dashboard/corporate?id=${userId}&t=${Date.now()}`, {
        cache: 'no-store'
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Database response error. Check Corporate tables.");
      }

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to fetch dashboard metrics");

      setDashboardData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositLoading(true);

    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: depositAmount })
      });

      const json = await res.json();
      if (json.success) {
        alert(`Successfully deposited $${parseFloat(depositAmount).toFixed(2)} credits!`);
        setShowDepositModal(false);
        setDepositAmount('');
        await fetchDashboardData(); 
      } else {
        alert(json.error || 'Deposit failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred during deposit.');
    } finally {
      setDepositLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-400 text-center text-xl animate-pulse font-medium">Loading Corporate Hub...</div>;
  if (error) return <div className="p-6 text-red-400 text-center font-bold">Error: {error}</div>;

  const metrics = dashboardData;
  const bounties = dashboardData?.bounties || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{metrics?.Company_Name}</h1>
          <p className="text-slate-400">Admin: {metrics?.Full_Name} ({metrics?.Verification_Status})</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/dashboard/manage-bounties" 
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all text-sm"
          >
            + Post New Bounty
          </Link>
          <Link 
            href="/dashboard/submissions" 
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2"
          >
            <span>Review Studio</span>
            {metrics?.Pending_Reviews > 0 && (
              <span className="bg-orange-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-extrabold">
                {metrics?.Pending_Reviews}
              </span>
            )}
          </Link>
        </div>
      </div>
      
      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Available Credits</h3>
            <p className="text-3xl font-extrabold text-emerald-400 mt-2">
              ${parseFloat(metrics?.Fiat_Balance || 0).toFixed(2)}
            </p>
          </div>
          <button 
            onClick={() => setShowDepositModal(true)}
            className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-all border border-slate-600 text-sm"
          >
            Deposit Funds
          </button>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Escrow</h3>
            <p className="text-3xl font-extrabold text-orange-400 mt-2">
              ${parseFloat(metrics?.Escrow_Balance || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Locked securely in pending bounties</p>
          </div>
          <Link 
            href="/dashboard/manage-bounties"
            className="mt-6 block w-full text-center bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white font-semibold py-2 rounded-lg transition-all border border-slate-800 text-sm"
          >
            View Escrow Ledger &rarr;
          </Link>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pending Submissions</h3>
            <p className="text-3xl font-extrabold text-blue-400 mt-2">
              {metrics?.Pending_Reviews || 0}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Awaiting corporate approval</p>
          </div>
          <Link 
            href="/dashboard/submissions"
            className="mt-6 block w-full text-center bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold py-2 rounded-lg transition-all border border-blue-500/30 text-sm"
          >
            Open Review Terminal &rarr;
          </Link>
        </div>
      </div>

      {/* TRACKING LEDGER */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Active Execution Oversight</h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
            {bounties.length} Claimed Tasks
          </span>
        </div>

        {bounties.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl space-y-2">
            <p className="font-semibold text-slate-400">No open tasks currently claimed by talent.</p>
            <p className="text-sm">Ensure your posted bounties have competitive escrow valuations to attract verified talent.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bounties.map((bounty: any) => (
              <div key={bounty.Bounty_ID} className="bg-slate-900/80 border border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Talent: {bounty.Student_Name || 'Assigned User'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      bounty.Status === 'Under_Review' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse' :
                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
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
                    <span className="text-slate-500 block text-[10px]">RP Verification</span>
                    <span className="font-bold text-blue-400">{bounty.Required_RP} RP Threshold</span>
                  </div>
                </div>

                {bounty.Status === 'Under_Review' ? (
                  <Link 
                    href="/dashboard/submissions" 
                    className="w-full bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 text-xs font-bold py-2 rounded-lg text-center transition-all border border-orange-500/30 block"
                  >
                    Review Submitted Deliverables &rarr;
                  </Link>
                ) : (
                  <div className="w-full bg-slate-800 text-slate-500 text-xs font-semibold py-2 rounded-lg text-center border border-slate-700/50">
                    Talent Working on Task
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DEPOSIT MODAL */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Add Funds to Wallet</h3>
              <button 
                onClick={() => setShowDepositModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Amount (USD)</label>
                <input 
                  type="number" required step="0.01" min="5" max="10000" placeholder="e.g. 500"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" disabled={depositLoading}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  {depositLoading ? 'Processing...' : 'Confirm Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}