'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

export default function StudentProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();

      if (!authJson.success || authJson.user.role !== 'Student') {
        router.push('/dashboard');
        return;
      }

      setUserId(authJson.user.userId);

      const res = await fetch(`/api/profile?id=${authJson.user.userId}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (json.success && json.data) {
        setProfile(json.data);
        setEditForm({ 
          username: json.data.Username || '', 
          bio: json.data.Bio || '' 
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaveLoading(true);

    try {
      const formData = new FormData();
      formData.append('userId', userId.toString());
      formData.append('username', editForm.username);
      formData.append('bio', editForm.bio);
      if (avatarFile) formData.append('avatar', avatarFile);
      if (bannerFile) formData.append('banner', bannerFile);

      const res = await fetch('/api/profile', {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      if (json.success) {
        setIsEditing(false);
        setAvatarFile(null);
        setBannerFile(null);
        await fetchProfile();
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert('Network error saving profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white">
      <TopNav role="Student" />
      <div className="text-slate-400 py-24 text-center animate-pulse font-medium">Loading Identity Profile...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col text-white pb-16">
      <TopNav role="Student" />

      {/* BANNER & AVATAR HEADER */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700">
          {/* Banner Image or Fallback Gradient */}
          <div 
            className="h-48 md:h-64 w-full bg-cover bg-center bg-gradient-to-r from-blue-600 to-purple-600"
            style={profile.Banner_Picture ? { backgroundImage: `url(${profile.Banner_Picture})` } : {}}
          ></div>
          
          <div className="px-6 md:px-12 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end relative">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-20 z-10 w-full md:w-auto text-center md:text-left">
              {/* Profile Avatar */}
              <div 
                className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-slate-900 bg-slate-800 bg-cover bg-center shrink-0 shadow-xl flex items-center justify-center text-4xl font-bold text-slate-500"
                style={profile.Profile_Picture ? { backgroundImage: `url(${profile.Profile_Picture})` } : {}}
              >
                {!profile.Profile_Picture && profile.Full_Name.charAt(0)}
              </div>
              
              <div className="mb-2">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">{profile.Full_Name}</h1>
                <p className="text-blue-400 font-mono text-sm mt-1">
                  {profile.Username ? `@${profile.Username}` : 'Username not set'}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setIsEditing(true)}
              className="mt-6 md:mt-0 px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm font-bold transition-all mx-auto md:mx-0 w-full md:w-auto"
            >
              Edit Identity Profile
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Bio, Metrics, Skills */}
        <div className="lg:col-span-1 space-y-8">
          
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">About</h3>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {profile.Bio || "This scholar hasn't added a bio yet."}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400">
              User ID: <span className="font-mono text-slate-300">#{profile.User_ID}</span>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Performance Metrics</h3>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Reputation</span>
              <span className="text-xl font-extrabold text-blue-400">{profile.Available_Rep_Points || 0} RP</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Bounties Executed</span>
              <span className="text-xl font-extrabold text-white">{profile.Total_Bounties_Completed || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
              <span className="text-sm font-medium text-slate-300">Execution Tier</span>
              <span className={`text-lg font-bold px-3 py-1 rounded border ${
                profile.Skill_Level === 'Advanced' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                profile.Skill_Level === 'Intermediate' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {profile.Skill_Level}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Verified Skills</h3>
            {profile.skills && profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: string, i: number) => (
                  <span key={i} className="bg-slate-900 border border-slate-700 text-slate-300 px-3 py-1 rounded-md text-xs font-semibold hover:border-blue-500 hover:text-blue-400 transition-colors cursor-default">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic">No skills verified yet. Complete LMS courses to unlock execution capabilities.</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Completed Courses Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl min-h-full">
            <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2">
              <span>📚</span> Educational Ledger
            </h2>
            
            {profile.completedCourses && profile.completedCourses.length > 0 ? (
              <div className="space-y-4">
                {profile.completedCourses.map((course: any) => (
                  <div key={course.Course_ID} className="bg-slate-900/60 border border-slate-700 rounded-xl p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-slate-600 transition-all">
                    <div>
                      <h3 className="font-bold text-white text-lg">{course.Title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Yields:</span>
                        <span className="text-xs text-blue-400 font-mono font-semibold">{course.Reward_Skill}</span>
                      </div>
                    </div>
                    <div className="text-left md:text-right shrink-0">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-bold">
                        +{course.Reward_RP} RP Granted
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl">
                <p className="font-semibold text-slate-400">Ledger is empty.</p>
                <p className="text-sm mt-1">Complete structural learning modules to build your immutable record.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-white">Edit Identity Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-6">
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                    <input 
                      type="text" placeholder="e.g., dev_ninja"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                      value={editForm.username}
                      onChange={(e) => setEditForm({...editForm, username: e.target.value.replace(/\s+/g, '').toLowerCase()})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bio / Summary</label>
                    <textarea 
                      rows={4} placeholder="Full-stack engineer specializing in..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm resize-none"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-300">Media Customization</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avatar Upload (Square)</label>
                    <input 
                      type="file" accept="image/png, image/jpeg, image/webp"
                      className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20"
                      onChange={(e) => setAvatarFile(e.target.files ? e.target.files[0] : null)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Banner Upload (Wide)</label>
                    <input 
                      type="file" accept="image/png, image/jpeg, image/webp"
                      className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-purple-600/10 file:text-purple-400 hover:file:bg-purple-600/20"
                      onChange={(e) => setBannerFile(e.target.files ? e.target.files[0] : null)}
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 shrink-0 flex gap-3 justify-end rounded-b-2xl">
              <button 
                type="button" onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" form="profile-form" disabled={saveLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {saveLoading ? 'Syncing...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}