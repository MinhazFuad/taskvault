'use client';

import { useState, useEffect } from 'react';

export default function CorporateDashboard({ userId }: { userId: number }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch(`/api/dashboard/corporate?id=${userId}&t=${Date.now()}`, {
          cache: 'no-store'
        });
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Database response error. Check Corporate tables.");
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

  if (loading) return <div className="p-6 text-slate-400 text-center text-xl animate-pulse">Loading Corporate Hub...</div>;
  if (error) return <div className="p-6 text-red-400 text-center">Error: {error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{metrics?.Company_Name}</h1>
          <p className="text-slate-400">Admin: {metrics?.Full_Name} ({metrics?.Verification_Status})</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg shadow-blue-500/30 transition-all">
          + Post New Bounty
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Available Credits</h3>
          <p className="text-4xl font-extrabold text-emerald-400 mt-2">${metrics?.Fiat_Balance || 0}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Active Escrow</h3>
          <p className="text-4xl font-extrabold text-orange-400 mt-2">$0</p>
        </div>
      </div>
    </div>
  );
}