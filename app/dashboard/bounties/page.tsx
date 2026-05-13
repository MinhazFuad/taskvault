'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

export default function PublicBountyBoardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [studentRp, setStudentRp] = useState<number>(0);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBountyBoard = async () => {
    try {
      setLoading(true);
      // 1. Authenticate and get current user ID safely
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();

      if (!authJson.success || authJson.user.role !== 'Student') {
        router.push('/dashboard');
        return;
      }

      const currentUserId = authJson.user.userId;
      setUserId(currentUserId);

      // 2. Fetch student's current RP score
      const metricsRes = await fetch(`/api/dashboard/student?id=${currentUserId}&t=${Date.now()}`, { cache: 'no-store' });
      const metricsJson = await metricsRes.json();
      if (metricsJson.success && metricsJson.data) {
        setStudentRp(parseInt(metricsJson.data.Available_Rep_Points) || 0);
      }

      // 3. Fetch all Open Bounties
      const bountiesRes = await fetch(`/api/bounties?status=Open&t=${Date.now()}`, { cache: 'no-store' });
      const bountiesJson = await bountiesRes.json();

      if (bountiesJson.success) {
        setBounties(bountiesJson.data);
      } else {
        setError(bountiesJson.error || 'Failed to load bounties');
      }

    } catch (err: any) {
      console.error("Bounty Board Load Error:", err);
      setError("Network error connecting to the bounty board.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBountyBoard();
  }, [router]);

  const handleClaimBounty = async (bountyId: number, requiredRp: number) => {
    if (!userId) return;

    // Reality check on the client before firing the transaction
    if (studentRp < requiredRp) {
      alert(`Access Denied: You need at least ${requiredRp} RP to claim this task. Complete more LMS courses to raise your score.`);
      return;
    }

    if (!confirm("Are you ready to commit to delivering this bounty? Accepting locks this task to your profile.")) {
      return;
    }

    setActionLoading(bountyId);

    try {
      const res = await fetch('/api/bounties/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bountyId, studentId: userId })
      });

      const json = await res.json();

      if (json.success) {
        alert("Bounty successfully claimed! You can now view and submit deliverables from your dashboard execution panel.");
        await loadBountyBoard(); // Refresh list to remove claimed task
      } else {
        alert(json.error || "Failed to claim bounty.");
      }
    } catch (err) {
      alert("Network error processing assignment.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* HEADER & RP METRIC BAR */}
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Public Bounty Board</h1>
            <p className="text-slate-400 text-sm mt-1">
              Escrow-funded corporate tasks. Claiming requires meeting or exceeding the verified Reputation Points threshold.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 px-6 py-3 rounded-xl flex items-center gap-4 shrink-0">
            <div>
              <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Your Active RP</span>
              <span className="text-2xl font-extrabold text-blue-400 block">{studentRp} RP</span>
            </div>
            <div className="h-8 w-px bg-slate-700"></div>
            <span className="text-xs text-slate-400 max-w-[120px] leading-tight">
              {studentRp === 0 ? "Complete courses to qualify" : "Ready to bid"}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center font-semibold">
            {error}
          </div>
        )}

        {/* BOUNTIES GRID */}
        {loading ? (
          <div className="text-slate-400 text-center py-16 animate-pulse text-lg font-medium">
            Scanning active corporate escrows...
          </div>
        ) : bounties.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <p className="text-lg font-semibold text-slate-400">No open bounties available right now.</p>
            <p className="text-sm">Check back soon as companies fund and deploy new escrows.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bounties.map(bounty => {
              const isQualified = studentRp >= bounty.Required_RP;
              const isLoadingThis = actionLoading === bounty.Bounty_ID;

              return (
                <div 
                  key={bounty.Bounty_ID} 
                  className={`bg-slate-800/60 backdrop-blur-sm border rounded-2xl p-6 flex flex-col justify-between h-full transition-all shadow-lg ${
                    isQualified 
                      ? 'border-slate-700 hover:border-blue-500/50 hover:shadow-blue-500/5' 
                      : 'border-slate-800/80 opacity-75 bg-slate-900/20'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          {bounty.Company_Name}
                        </span>
                        <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
                          {bounty.Title}
                        </h2>
                      </div>
                      
                      <div className="bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-lg text-right shrink-0">
                        <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Reward</span>
                        <span className="text-lg font-extrabold text-emerald-400 block">
                          ${parseFloat(bounty.Reward_Amount).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-900/40 p-4 rounded-xl border border-slate-800 min-h-[80px]">
                      {bounty.Description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-700/60 space-y-4">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-normal">Skill Required:</span>
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-semibold">
                          {bounty.Required_Skill}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-normal">Threshold:</span>
                        <span className={`font-bold ${isQualified ? 'text-emerald-400' : 'text-red-400'}`}>
                          {bounty.Required_RP} RP
                        </span>
                      </div>
                    </div>

                    {isQualified ? (
                      <button 
                        onClick={() => handleClaimBounty(bounty.Bounty_ID, bounty.Required_RP)}
                        disabled={isLoadingThis}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isLoadingThis ? (
                          <span className="animate-pulse font-semibold">Claiming and Locking Task...</span>
                        ) : (
                          <span>⚡ Claim This Bounty</span>
                        )}
                      </button>
                    ) : (
                      <div className="w-full bg-slate-900/80 border border-red-500/30 text-red-400/90 text-xs font-semibold py-3 rounded-xl text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                        <span>🔒 Access Restricted (Requires +{bounty.Required_RP - studentRp} more RP)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}