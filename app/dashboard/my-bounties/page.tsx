'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

export default function ExecutionStudioPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track submission state per bounty
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [formInputs, setFormInputs] = useState<{ [key: number]: { text: string; file: File | null } }>({});

  const fetchMyBounties = async () => {
    try {
      setLoading(true);
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();

      // SECURITY LOCK: Only allow Students
      if (!authJson.success || authJson.user.role !== 'Student') {
        router.push('/dashboard');
        return;
      }

      const currentUserId = authJson.user.userId;
      setUserId(currentUserId);

      const res = await fetch(`/api/dashboard/student?id=${currentUserId}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (json.success && json.data) {
        setBounties(json.data.bounties || []);
      } else {
        setError(json.error || 'Failed to load execution ledger');
      }
    } catch (err: any) {
      setError('Network error connecting to Execution Studio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBounties();
  }, [router]);

  const handleTextChange = (bountyId: number, text: string) => {
    setFormInputs(prev => ({
      ...prev,
      [bountyId]: { ...prev[bountyId], text, file: prev[bountyId]?.file || null }
    }));
  };

  const handleFileChange = (bountyId: number, file: File | null) => {
    setFormInputs(prev => ({
      ...prev,
      [bountyId]: { ...prev[bountyId], text: prev[bountyId]?.text || '', file }
    }));
  };

  const handleSubmitDeliverables = async (e: React.FormEvent, bountyId: number) => {
    e.preventDefault();
    if (!userId) return;

    const inputs = formInputs[bountyId];
    const text = inputs?.text?.trim() || '';
    const file = inputs?.file;

    if (!text && !file) {
      alert("You must provide either written documentation or attach a deliverable file to submit.");
      return;
    }

    if (!confirm("Are you sure you want to submit these deliverables? Once submitted, the Corporate client will begin their review.")) {
      return;
    }

    setSubmittingId(bountyId);

    try {
      // Must use FormData to handle multipart file uploads
      const formData = new FormData();
      formData.append('bountyId', bountyId.toString());
      formData.append('studentId', userId.toString());
      formData.append('submissionText', text);
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch('/api/bounties/submit', {
        method: 'POST',
        body: formData, 
      });

      const json = await res.json();

      if (json.success) {
        alert("Deliverables successfully lodged! Awaiting corporate review.");
        await fetchMyBounties(); 
      } else {
        alert(json.error || "Failed to submit deliverables.");
      }
    } catch (err) {
      alert("A network error occurred while uploading assets.");
    } finally {
      setSubmittingId(null);
    }
  };

  const activeTasks = bounties.filter(b => b.Status === 'Assigned');
  const pendingReviews = bounties.filter(b => b.Status === 'Under_Review');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <Link href="/dashboard" className="text-blue-400 text-sm hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link>
            <h1 className="text-3xl font-bold tracking-tight">Execution Studio</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your active task commitments and submit final deliverables.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center font-semibold text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 py-16 text-center animate-pulse font-medium">Booting execution environment...</div>
        ) : (
          <div className="space-y-12">
            
            {/* ACTIVE EXECUTION WORKSPACE */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                Action Required ({activeTasks.length})
              </h2>

              {activeTasks.length === 0 ? (
                <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500 space-y-2">
                  <p className="text-lg font-semibold text-slate-400">Your execution queue is clear.</p>
                  <p className="text-sm">Claim an escrow on the Bounty Board to begin a new task.</p>
                  <Link href="/dashboard/bounties" className="text-blue-400 text-xs font-bold hover:underline block pt-2">
                    Browse Bounty Board &rarr;
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {activeTasks.map(bounty => {
                    const isSubmitting = submittingId === bounty.Bounty_ID;
                    const daysUntilDue = Math.ceil((new Date(bounty.Due_Date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

                    return (
                      <div key={bounty.Bounty_ID} className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                        
                        {/* HEADER INFO */}
                        <div className="p-6 border-b border-slate-700 bg-slate-900/40">
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <div>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">{bounty.Company_Name}</span>
                              <h3 className="text-xl font-bold tracking-tight text-white">{bounty.Title}</h3>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Escrow</span>
                              <span className="text-lg font-extrabold text-emerald-400 block">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-900/60 p-4 rounded-xl border border-slate-800 max-h-[150px] overflow-y-auto">
                            {bounty.Description}
                          </p>

                          <div className="mt-4 flex justify-between items-center text-xs font-medium">
                            <div>
                               <span className="text-slate-500">Tier Limit: </span>
                               <span className="text-blue-400">{bounty.Experience_Level}</span>
                            </div>
                            <div className="text-orange-400 font-bold">
                               Due in: {daysUntilDue} days
                            </div>
                          </div>
                        </div>

                        {/* SUBMISSION FORM */}
                        <form onSubmit={(e) => handleSubmitDeliverables(e, bounty.Bounty_ID)} className="p-6 space-y-5 flex-grow flex flex-col justify-end bg-slate-800/60">
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Written Documentation / Links</label>
                            <textarea 
                              rows={3} 
                              placeholder="Provide execution notes, links to repositories, or written proofs..."
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none text-sm"
                              value={formInputs[bounty.Bounty_ID]?.text || ''}
                              onChange={(e) => handleTextChange(bounty.Bounty_ID, e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Attach Asset File (Optional)</label>
                            <div className="relative">
                              <input 
                                type="file" 
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-400 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer"
                                onChange={(e) => handleFileChange(bounty.Bounty_ID, e.target.files ? e.target.files[0] : null)}
                              />
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-auto flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? (
                              <span className="animate-pulse">Uploading Assets to Secure Vault...</span>
                            ) : (
                              <span>🚀 Submit Final Deliverables</span>
                            )}
                          </button>
                        </form>

                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* AWAITING REVIEW SECTION */}
            {pendingReviews.length > 0 && (
              <section className="space-y-4 pt-8 border-t border-slate-800">
                <h2 className="text-xl font-bold text-slate-400 pb-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                  Awaiting Client Approval ({pendingReviews.length})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingReviews.map(bounty => (
                    <div key={bounty.Bounty_ID} className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            {bounty.Company_Name}
                          </span>
                          <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Under Review
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-300 tracking-tight">{bounty.Title}</h3>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-800 text-slate-500 font-medium">
                        <div>Escrow Value: <span className="font-extrabold text-emerald-400">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span></div>
                        <div>Submitted: <span className="text-slate-400">{bounty.Submitted_At ? new Date(bounty.Submitted_At).toLocaleDateString() : 'N/A'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  );
}