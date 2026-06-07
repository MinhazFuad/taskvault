'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ username: '', bio: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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

      const profRes = await fetch(`/api/profile?id=${authJson.user.userId}&t=${Date.now()}`);
      const profJson = await profRes.json();

      if (profJson.success) {
        setProfile(profJson.data);
        setFormData({
          username: profJson.data.Username || '',
          bio: profJson.data.Bio || ''
        });
      } else {
        setError(profJson.error);
      }
    } catch (err) {
      setError("Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    if (type === 'avatar') {
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
    } else {
      setBannerFile(file);
      setBannerPreview(previewUrl);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      const data = new FormData();
      data.append('userId', userId.toString());
      data.append('username', formData.username);
      data.append('bio', formData.bio);
      if (avatarFile) data.append('avatar', avatarFile);
      if (bannerFile) data.append('banner', bannerFile);

      const res = await fetch('/api/profile', {
        method: 'POST',
        body: data, 
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
      alert("Network error updating profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-white">
      <TopNav role="Student" />
      <div className="flex-1 flex items-center justify-center animate-pulse text-slate-400">Loading Profile...</div>
    </div>
  );

  const displayAvatar = avatarPreview || profile?.Profile_Picture || null;
  const displayBanner = bannerPreview || profile?.Banner_Image || null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-white font-sans">
      <TopNav role="Student" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 w-full py-8 space-y-8">
        
        {error && <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl text-center">{error}</div>}

        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl relative">
          
          <div 
            className="h-48 md:h-64 w-full bg-slate-800 relative group"
            style={displayBanner ? { backgroundImage: `url(${displayBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            {!displayBanner && <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />}
            
            {isEditing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => bannerInputRef.current?.click()} className="bg-white/20 hover:bg-white/30 backdrop-blur text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg">
                  📷 Change Banner
                </button>
                <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
              </div>
            )}
          </div>

          <div className="px-6 sm:px-10 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 -mt-16 sm:-mt-20 relative z-10">
              
              <div className="flex flex-col items-center sm:items-start">
                <div className="relative group">
                  <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-slate-800 bg-slate-900 shadow-xl overflow-hidden flex items-center justify-center ${displayAvatar ? '' : 'bg-gradient-to-br from-slate-700 to-slate-800'}`}>
                    {displayAvatar ? (
                       <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                       <span className="text-4xl font-bold text-slate-500">{profile?.Full_Name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  
                  {isEditing && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-4 border-transparent" onClick={() => avatarInputRef.current?.click()}>
                       <span className="text-2xl">📷</span>
                       <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-4 sm:mt-0">
                {isEditing ? (
                  <>
                    <button onClick={() => { setIsEditing(false); setAvatarPreview(null); setBannerPreview(null); }} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-all">Cancel</button>
                    <button onClick={handleSaveProfile} disabled={saving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">{saving ? 'Saving...' : 'Save Profile'}</button>
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-sm font-bold backdrop-blur-sm transition-all">Edit Profile</button>
                )}
              </div>
            </div>

            <div className="mt-6 text-center sm:text-left space-y-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">{profile?.Full_Name || 'Unknown User'}</h1>
                
                {isEditing ? (
                  <div className="mt-2 flex flex-col sm:flex-row items-center gap-2">
                    <span className="text-slate-500 font-mono">@</span>
                    <input 
                      type="text" placeholder="username"
                      className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                      value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                    />
                  </div>
                ) : (
                  <p className="text-blue-400 font-mono mt-1">@{profile?.Username || `user${userId}`}</p>
                )}
              </div>

              {isEditing ? (
                <textarea 
                  rows={3} placeholder="Write a short bio about yourself..."
                  className="w-full max-w-2xl bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 resize-none"
                  value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})}
                />
              ) : (
                <p className="text-slate-300 text-sm max-w-2xl leading-relaxed whitespace-pre-wrap">
                  {profile?.Bio || <span className="text-slate-500 italic">No bio provided.</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="space-y-6">
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-700/50 pb-2">Reputation & Tier</h3>
              <div className="space-y-5">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Available RP</span>
                  <span className="text-3xl font-extrabold text-blue-400">{profile?.Available_Rep_Points || 0}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Skill Tier Verified</span>
                  <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold border ${profile?.Skill_Level === 'Advanced' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : profile?.Skill_Level === 'Intermediate' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {profile?.Skill_Level || 'Junior'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-700/50 pb-2">Unlocked Skills</h3>
              {profile?.skills?.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No skills unlocked yet. Complete courses to earn skills.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile?.skills?.map((skill: string, i: number) => (
                    <span key={i} className="bg-slate-700/50 text-slate-300 border border-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl h-full">
              <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-3">
                <h3 className="text-sm font-bold text-white tracking-tight">Academic Transcripts</h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-900/50 px-2 py-1 rounded">{profile?.courses?.length || 0} Completed</span>
              </div>
              
              {profile?.courses?.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-700 rounded-xl">
                  <p className="text-slate-400 text-sm font-semibold">No coursework completed.</p>
                  <Link href="/dashboard/courses" className="text-blue-400 text-xs mt-2 inline-block hover:underline">Browse LMS Catalog &rarr;</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile?.courses?.map((course: any, i: number) => (
                    <div key={i} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex justify-between items-center hover:border-blue-500/30 transition-colors">
                      <div>
                        <h4 className="font-bold text-white text-sm">{course.Title}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
                          Completed on {new Date(course.Completed_At).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Granted Skill</span>
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                          {course.Reward_Skill}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}