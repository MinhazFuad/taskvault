'use client';

import { useState, useEffect } from 'react';

export default function StudentDashboard({ userId }: { userId: number }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Force fresh data and bypass Next.js cache
        const res = await fetch(`/api/dashboard/student?id=${userId}&t=${Date.now()}`, {
          cache: 'no-store'
        });
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Database response error. Check XAMPP.");
        }

        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to fetch");

        setMetrics(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [userId]);

  if (loading) return <div className="p-6 text-slate-400 text-center text-xl animate-pulse">Accessing Vault...</div>;
  if (error) return <div className="p-6 text-red-400 text-center">Error: {error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-white">Welcome, {metrics?.Full_Name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Reputation Points</h3>
          <p className="text-4xl font-extrabold text-blue-400 mt-2">{metrics?.Available_Rep_Points || 0} RP</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Global Rank</h3>
          <p className="text-4xl font-extrabold text-purple-400 mt-2">{metrics?.Global_Elo_Rank || 'Unranked'}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Wallet Balance</h3>
          <p className="text-4xl font-extrabold text-emerald-400 mt-2">${metrics?.Fiat_Balance || 0}</p>
        </div>
      </div>
    </div>
  );
}