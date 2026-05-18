'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

// Standardized platform skill taxonomy
const PLATFORM_SKILLS = [
  "Angular", "AWS", "Azure", "C#", "Cybersecurity", "Data Analysis", 
  "Docker", "Flutter", "Go", "Google Cloud (GCP)", "GraphQL", "HTML/CSS", 
  "Java", "Kotlin", "Kubernetes", "Machine Learning", "MongoDB", "Next.js", 
  "Node.js", "NoSQL", "PHP", "PostgreSQL", "Python", "React", "React Native", 
  "Ruby", "Rust", "SQL", "Swift", "Tailwind CSS", "Technical Writing", 
  "UI/UX Design", "Vue.js"
];

export default function ManageBountiesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bounties, setBounties] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rewardAmount: '',
    experienceLevel: 'Junior',
    requiredSkill: '',
    dueDate: ''
  });

  const fetchMyBounties = async (corporateId: number) => {
    try {
      const res = await fetch(`/api/bounties?corporateUserId=${corporateId}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setBounties(json.data);
      } else {
        setError(json.error || 'Failed to load bounties');
      }
    } catch (err: any) {
      setError('Network error loading bounties');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user.role === 'Corporate') {
          setUserId(data.user.userId);
          fetchMyBounties(data.user.userId);
        } else {
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setAuthLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setFormLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corporateUserId: userId, ...formData })
      });

      const json = await res.json();

      if (json.success) {
        alert('Bounty successfully posted! Funds have been locked in escrow.');
        setFormData({ title: '', description: '', rewardAmount: '', experienceLevel: 'Junior', requiredSkill: '', dueDate: '' });
        await fetchMyBounties(userId);
      } else {
        alert(json.error || 'Failed to post bounty');
      }
    } catch (err) {
      alert('An unexpected network error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-400 flex items-center justify-center font-semibold">Verifying Corporate Credentials...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Corporate" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* POST BOUNTY FORM */}
        <div className="lg:col-span-1 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl h-fit space-y-6">
          <div>
            <Link href="/dashboard" className="text-blue-400 text-sm hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link>
            <h2 className="text-2xl font-bold text-white">Post New Bounty</h2>
            <p className="text-slate-400 text-sm mt-1">Funds locked in escrow immediately upon posting.</p>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm font-medium">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Bounty Title</label>
              <input type="text" required placeholder="e.g., Build a React Auth Flow" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Detailed Description</label>
              <textarea required rows={4} placeholder="List explicit criteria and deliverables..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Reward Amount ($ USD)</label>
              <input type="number" required step="0.01" min="1" placeholder="e.g., 150.00" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" value={formData.rewardAmount} onChange={e => setFormData({ ...formData, rewardAmount: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Talent Level</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" value={formData.experienceLevel} onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })}>
                  <option value="Junior">Junior</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Required Skill Domain</label>
                <select 
                  required 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" 
                  value={formData.requiredSkill} 
                  onChange={e => setFormData({ ...formData, requiredSkill: e.target.value })}
                >
                  <option value="" disabled>Select Domain...</option>
                  {PLATFORM_SKILLS.map(skill => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Due Date</label>
              <input type="date" required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
            </div>

            <button type="submit" disabled={formLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all mt-4 disabled:opacity-50 shadow-lg shadow-blue-500/20">
              {formLoading ? 'Locking Escrow...' : 'Publish & Escrow Funds'}
            </button>
          </form>
        </div>

        {/* ACTIVE BOUNTIES LIST */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Your Active & Escrowed Bounties</h2>

            {fetchLoading ? (
              <div className="text-slate-400 py-8 text-center animate-pulse">Loading posted bounties...</div>
            ) : bounties.length === 0 ? (
              <div className="text-slate-500 py-12 text-center border border-dashed border-slate-700 rounded-xl">No bounties posted yet.</div>
            ) : (
              <div className="space-y-4">
                {bounties.map(bounty => (
                  <div key={bounty.Bounty_ID} className="bg-slate-900/80 border border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-600 transition-all">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-lg text-white">{bounty.Title}</h3>
                          <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${bounty.Status === 'Open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : bounty.Status === 'Assigned' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : bounty.Status === 'Under_Review' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-slate-700 text-slate-300'}`}>{bounty.Status}</span>
                        </div>
                        <p className="text-slate-400 text-sm whitespace-pre-line mt-2">{bounty.Description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-500 block">Escrow Locked</span>
                        <span className="text-xl font-extrabold text-emerald-400 block">${parseFloat(bounty.Reward_Amount).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                      <div><span className="text-slate-500 font-medium">Level:</span> <span className={bounty.Experience_Level === 'Advanced' ? 'text-purple-400 font-bold' : bounty.Experience_Level === 'Intermediate' ? 'text-blue-400 font-bold' : 'text-emerald-400 font-bold'}>{bounty.Experience_Level}</span></div>
                      <div>•</div>
                      <div><span className="text-slate-500 font-medium">Skill Domain:</span> <span className="text-white font-semibold">{bounty.Required_Skill}</span></div>
                      <div>•</div>
                      <div><span className="text-slate-500 font-medium">Due:</span> <span className="text-orange-400 font-bold">{new Date(bounty.Due_Date).toLocaleDateString()}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}