'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

export default function PublicBountyBoardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [studentRp, setStudentRp] = useState<number>(0);
  const [studentSkills, setStudentSkills] = useState<string[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getStudentLevel = (rp: number) => {
    if (rp >= 1001) return 'Advanced';
    if (rp >= 401) return 'Intermediate';
    return 'Junior';
  };

  const getStake = (level: string) => {
    if (level === 'Intermediate') return 40;
    if (level === 'Advanced') return 80;
    return 20;
  };

  const loadBountyBoard = async () => {
    try {
      setLoading(true);
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();

      if (!authJson.success || authJson.user.role !== 'Student') {
        router.push('/dashboard');
        return;
      }

      const currentUserId = authJson.user.userId;
      setUserId(currentUserId);

      const metricsRes = await fetch(`/api/dashboard/student?id=${currentUserId}&t=${Date.now()}`, { cache: 'no-store' });
      const metricsJson = await metricsRes.json();
      if (metricsJson.success && metricsJson.data) {
        setStudentRp(parseInt(metricsJson.data.Available_Rep_Points) || 0);
        setStudentSkills(metricsJson.data.earnedSkills || []);
        const cd = metricsJson.data.Cooldown_Until ? new Date(metricsJson.data.Cooldown_Until) : null;
        setCooldownUntil(cd && cd > new Date() ? cd : null);
      }

      const bountiesRes = await fetch(`/api/bounties?status=Open&t=${Date.now()}`, { cache: 'no-store' });
      const bountiesJson = await bountiesRes.json();

      if (bountiesJson.success) {
        setBounties(bountiesJson.data);
      } else {
        setError(bountiesJson.error || 'Failed to load bounties');
      }
    } catch (err: any) {
      setError("Network error connecting to the bounty board.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBountyBoard();
  }, [router]);

  const handleClaimBounty = async (bountyId: number, requiredRp: number, requiredSkill: string, stakeRp: number) => {
    if (!userId) return;

    const hasSkill = studentSkills.includes(requiredSkill.toLowerCase().trim());
    if (studentRp < requiredRp || !hasSkill) {
      alert(`Access Denied: You do not meet the exact tier and skill prerequisites for this task.`);
      return;
    }
    if (studentRp < stakeRp) {
      alert(`Insufficient RP: This bounty requires a ${stakeRp} RP stake but you only have ${studentRp} RP available.`);
      return;
    }

    if (!confirm(`Commit to this bounty? You will stake ${stakeRp} RP — returned with a bonus on approval, forfeited on deadline miss.`)) return;

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
        await loadBountyBoard();
      } else {
        alert(json.error || "Failed to claim bounty.");
      }
    } catch (err) {
      alert("Network error processing assignment.");
    } finally {
      setActionLoading(null);
    }
  };

  const studentLevel = getStudentLevel(studentRp);
  const cooldownDaysLeft = cooldownUntil
    ? Math.ceil((cooldownUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">

        {/* COOLDOWN BANNER */}
        {cooldownUntil && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-red-400 text-xl mt-0.5 shrink-0">⛔</span>
            <div>
              <p className="font-bold text-red-400">Bounty Claims Blocked — Penalty Cooldown Active</p>
              <p className="text-red-300/70 text-sm mt-0.5">
                You missed a bounty deadline. You cannot claim new bounties for{' '}
                <strong>{cooldownDaysLeft} more {cooldownDaysLeft === 1 ? 'day' : 'days'}</strong>{' '}
                (until {cooldownUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}).
              </p>
            </div>
          </div>
        )}

        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Public Bounty Board</h1>
            <p className="text-slate-400 text-sm mt-1">Escrow-funded corporate tasks. Claiming requires meeting the Tier and holding the exact Skill.</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 px-6 py-3 rounded-xl flex items-center gap-4 shrink-0">
            <div>
              <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Your Tier</span>
              <span className={`text-2xl font-extrabold block ${studentLevel === 'Advanced' ? 'text-purple-400' : studentLevel === 'Intermediate' ? 'text-blue-400' : 'text-emerald-400'}`}>{studentLevel}</span>
            </div>
            <div className="h-8 w-px bg-slate-700"></div>
            <span className="text-xs text-slate-400 max-w-[120px] leading-tight">({studentRp} RP)</span>
          </div>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center font-semibold">{error}</div>}

        {loading ? (
          <div className="text-slate-400 text-center py-16 animate-pulse text-lg font-medium">Scanning active corporate escrows...</div>
        ) : bounties.length === 0 ? (
          <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <p className="text-lg font-semibold text-slate-400">No open bounties available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bounties.map(bounty => {
              const stakeRp = getStake(bounty.Experience_Level);
              const meetsTier = studentRp >= bounty.Required_RP;
              const meetsSkill = studentSkills.includes(bounty.Required_Skill.toLowerCase().trim());
              const canAffordStake = studentRp >= stakeRp;
              const isQualified = meetsTier && meetsSkill && canAffordStake && !cooldownUntil;
              
              const isLoadingThis = actionLoading === bounty.Bounty_ID;
              const daysUntilDue = Math.ceil((new Date(bounty.Due_Date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

              return (
                <div key={bounty.Bounty_ID} className={`bg-slate-800/60 backdrop-blur-sm border rounded-2xl p-6 flex flex-col justify-between h-full transition-all shadow-lg ${isQualified ? 'border-slate-700 hover:border-blue-500/50 hover:shadow-blue-500/5' : 'border-slate-800/80 opacity-75 bg-slate-900/20'}`}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{bounty.Company_Name}</span>
                          {bounty.Avg_Client_Rating ? (
                            <span className="flex items-center gap-0.5 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-400">
                              ★ {bounty.Avg_Client_Rating}
                              <span className="text-slate-500 font-normal ml-1">({bounty.Rating_Count})</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-medium">No ratings yet</span>
                          )}
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight leading-snug">{bounty.Title}</h2>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-lg text-right shrink-0">
                        <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Reward</span>
                        <span className="text-lg font-extrabold text-emerald-400 block">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span>
                      </div>
                    </div>

                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-900/40 p-4 rounded-xl border border-slate-800 min-h-[80px]">{bounty.Description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-700/60 space-y-4">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-normal">Skill Required:</span>
                        <span className={`px-2 py-0.5 rounded font-semibold border ${meetsSkill ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {bounty.Required_Skill}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-normal">Tier:</span>
                          <span className={`font-bold ${!meetsTier ? 'text-red-400' : bounty.Experience_Level === 'Advanced' ? 'text-purple-400' : bounty.Experience_Level === 'Intermediate' ? 'text-blue-400' : 'text-emerald-400'}`}>
                            {bounty.Experience_Level}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${canAffordStake ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          Stakes {stakeRp} RP
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-orange-400 font-semibold mb-2">
                      Due in: {daysUntilDue} days ({new Date(bounty.Due_Date).toLocaleDateString()})
                    </div>

                    {isQualified ? (
                      <button onClick={() => handleClaimBounty(bounty.Bounty_ID, bounty.Required_RP, bounty.Required_Skill, stakeRp)} disabled={isLoadingThis} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoadingThis ? <span className="animate-pulse font-semibold">Claiming...</span> : <span>⚡ Claim — Stakes {stakeRp} RP</span>}
                      </button>
                    ) : (
                      <div className="w-full bg-slate-900/80 border border-red-500/30 text-red-400/90 text-xs font-semibold py-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 cursor-not-allowed">
                        {cooldownUntil && <span>⛔ Cooldown active — {cooldownDaysLeft}d remaining</span>}
                        {!cooldownUntil && !meetsTier && <span>🔒 Requires {bounty.Experience_Level} Tier</span>}
                        {!cooldownUntil && !meetsSkill && <span>🔒 Missing Skill: {bounty.Required_Skill}</span>}
                        {!cooldownUntil && meetsTier && meetsSkill && !canAffordStake && <span>🔒 Need {stakeRp} RP to stake</span>}
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