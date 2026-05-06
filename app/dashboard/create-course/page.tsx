'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

export default function CreateCoursePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [course, setCourse] = useState({
    title: '', description: '', rewardRp: 50, rewardSkill: ''
  });

  const [modules, setModules] = useState([
    { title: '', content: '' }
  ]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user.role === 'Instructor') {
            setUserId(data.user.userId);
        } else {
            router.push('/dashboard'); 
        }
      })
      .finally(() => setAuthLoading(false));
  }, [router]);

  const addModule = () => {
    setModules([...modules, { title: '', content: '' }]);
  };

  const updateModule = (index: number, field: string, value: string) => {
    const newModules = [...modules];
    newModules[index] = { ...newModules[index], [field]: value };
    setModules(newModules);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);

    try {
      const res = await fetch('/api/courses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructorId: userId, ...course, modules })
      });
      
      const json = await res.json();
      if (json.success) {
        alert('Course Published Successfully!');
        router.push('/dashboard'); 
      } else {
        alert(json.error);
      }
    } catch (err) {
      console.error(err);
      alert('A network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
      return <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-400 flex items-center justify-center">Verifying Instructor Credentials...</div>;
  }

  return (
    // Applied the gradient background here
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      <TopNav role="Instructor" />
      
      <div className="max-w-4xl mx-auto w-full p-6 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Course Builder</h1>
        
        <form onSubmit={handlePublish} className="space-y-8">
          <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
            <h2 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2">1. Course Details</h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Course Title</label>
              <input 
                type="text" required
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                onChange={e => setCourse({...course, title: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Course Description</label>
              <textarea 
                required rows={3}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                onChange={e => setCourse({...course, description: e.target.value})}
              />
            </div>

            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-slate-400 mb-1">Skill Verified</label>
                <input 
                  type="text" required placeholder="e.g., Python, Negotiation"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  onChange={e => setCourse({...course, rewardSkill: e.target.value})}
                />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-slate-400 mb-1">RP Reward</label>
                <input 
                  type="number" required min="10"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  onChange={e => setCourse({...course, rewardRp: parseInt(e.target.value)})}
                  value={course.rewardRp}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl border border-slate-700 shadow-lg space-y-6">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
               <h2 className="text-xl font-bold text-slate-200">2. Curriculum Modules</h2>
               <span className="text-slate-400 text-sm">{modules.length} Modules</span>
            </div>

            {modules.map((mod, index) => (
              <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-3 relative">
                <h3 className="text-blue-400 font-bold text-sm absolute top-4 right-4">Module {index + 1}</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Module Title</label>
                  <input 
                    type="text" required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    onChange={e => updateModule(index, 'title', e.target.value)}
                    value={mod.title}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Module Content</label>
                  <textarea 
                    required rows={4}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    onChange={e => updateModule(index, 'content', e.target.value)}
                    value={mod.content}
                  />
                </div>
              </div>
            ))}

            <button 
              type="button" 
              onClick={addModule}
              className="w-full border-2 border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-blue-500 hover:bg-blue-500/5 rounded-lg py-3 font-semibold transition-colors"
            >
              + Add Another Module
            </button>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
          >
            {loading ? 'Publishing Course...' : 'Publish Course to Vault'}
          </button>
        </form>
      </div>
    </div>
  );
}