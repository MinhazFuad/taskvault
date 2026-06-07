'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TopNav from '@/components/TopNav';

const PLATFORM_SKILLS = ["Angular", "AWS", "Azure", "C#", "Cybersecurity", "Data Analysis", "Docker", "Flutter", "Go", "Google Cloud (GCP)", "GraphQL", "HTML/CSS", "Java", "Kotlin", "Kubernetes", "Machine Learning", "MongoDB", "Next.js", "Node.js", "NoSQL", "PHP", "PostgreSQL", "Python", "React", "React Native", "Ruby", "Rust", "SQL", "Swift", "Tailwind CSS", "Technical Writing", "UI/UX Design", "Vue.js"];

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;

  const [userId, setUserId] = useState<number | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [expandedModule, setExpandedModule] = useState<number>(0);

  const [course, setCourse] = useState({ title: '', description: '', coverImage: '', imageZoom: 0, imageX: 0, imageY: 0, rewardRp: 50, rewardSkill: '' });
  const [modules, setModules] = useState([{ title: '', content: '', videoUrl: '' }]);

  useEffect(() => {
    const initializeEditing = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        
        if (!authData.success || authData.user.role !== 'Instructor') return router.push('/dashboard');
        setUserId(authData.user.userId);

        const courseRes = await fetch(`/api/courses/${courseId}?t=${Date.now()}`);
        const courseData = await courseRes.json();

        if (courseData.success) {
          if (courseData.course.Instructor_ID !== authData.user.userId) return router.push('/dashboard');

          setCourse({
            title: courseData.course.Title || '',
            description: courseData.course.Description || '',
            coverImage: courseData.course.Cover_Image || '',
            imageZoom: courseData.course.Image_Zoom || 0,
            imageX: courseData.course.Image_X || 0,
            imageY: courseData.course.Image_Y || 0,
            rewardRp: courseData.course.Reward_RP || 50,
            rewardSkill: courseData.course.Reward_Skill || ''
          });

          if (courseData.modules && courseData.modules.length > 0) {
            setModules(courseData.modules.map((m: any) => ({ title: m.Title || '', content: m.Content || '', videoUrl: m.Video_URL || '' })));
          }
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        router.push('/dashboard');
      } finally {
        setLoadingInitial(false);
      }
    };
    if (courseId) initializeEditing();
  }, [courseId, router]);

  const addModule = () => { setModules([...modules, { title: '', content: '', videoUrl: '' }]); setExpandedModule(modules.length); };
  const removeModule = (indexToRemove: number) => {
    if (modules.length === 1) return alert("Curriculum must contain at least one module.");
    setModules(modules.filter((_, index) => index !== indexToRemove));
    setExpandedModule(0);
  };
  const updateModule = (index: number, field: string, value: string) => {
    const newModules = [...modules];
    newModules[index] = { ...newModules[index], [field]: value };
    setModules(newModules);
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!course.title || !course.description || !course.rewardSkill) return alert("Please complete all required Foundation fields.");
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const invalidModule = modules.find(m => !m.title || !m.content);
      if (invalidModule) return alert("All modules must have a Title and Content.");
      setCurrentStep(3);
    }
  };
  const prevStep = () => { if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3); };

  const handleUpdate = async () => {
    if (!userId) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instructorId: userId, ...course, modules }) });
      const json = await res.json();
      if (json.success) router.push('/dashboard'); 
      else { alert(json.error); setIsPublishing(false); }
    } catch (err) {
      alert('A network error occurred.');
      setIsPublishing(false);
    }
  };

  const getTransformStyle = () => {
    if (course.imageZoom === 0 && course.imageX === 0 && course.imageY === 0) return undefined;
    const scale = 1 + (course.imageZoom / 50);
    return `scale(${scale}) translate(${course.imageX}%, ${course.imageY}%)`;
  };

  if (loadingInitial) return <div className="min-h-screen bg-slate-900 text-slate-400 flex items-center justify-center animate-pulse">Loading Course Architecture...</div>;

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-white flex flex-col pb-20">
      <TopNav role="Instructor" />
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight mb-8">Edit Course: #{courseId}</h1>
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 -z-10 rounded-full transition-all duration-500`} style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}></div>
            {[{ num: 1, label: 'Foundation' }, { num: 2, label: 'Curriculum' }, { num: 3, label: 'Review & Deploy' }].map((step) => (
              <div key={step.num} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-colors ${currentStep >= step.num ? 'bg-blue-600 border-slate-900 shadow-lg text-white' : 'bg-slate-800 border-slate-900 text-slate-500'}`}>{step.num}</div>
                <span className={`text-xs font-bold uppercase tracking-wider ${currentStep >= step.num ? 'text-blue-400' : 'text-slate-600'}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl p-8 min-h-[500px] flex flex-col">
          {currentStep === 1 && (
            <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-bold border-b border-slate-700/50 pb-4">Core Metadata</h2>
              <div className="space-y-5">
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Course Title *</label><input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" value={course.title} onChange={e => setCourse({...course, title: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comprehensive Description *</label><textarea rows={4} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none" value={course.description} onChange={e => setCourse({...course, description: e.target.value})} /></div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cover Image URL - Optional</label>
                  <input type="url" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-blue-400 font-mono text-sm focus:outline-none focus:border-blue-500" value={course.coverImage} onChange={e => setCourse({...course, coverImage: e.target.value})} />

                  {course.coverImage && (
                    <div className="mt-6 bg-slate-900/40 border border-slate-700/50 p-6 rounded-2xl flex flex-col md:flex-row gap-8">
                      <div className="w-full md:w-1/2 aspect-video bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 relative group shrink-0">
                        <img src={course.coverImage} alt="Cover Preview" className="w-full h-full object-cover transition-transform duration-100 ease-out" style={getTransformStyle() ? { transform: getTransformStyle() } : undefined} onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-0 group-hover:opacity-40 transition-opacity">
                          <div className="border-b border-r border-white/50"></div><div className="border-b border-r border-white/50"></div><div className="border-b border-white/50"></div>
                          <div className="border-b border-r border-white/50"></div><div className="border-b border-r border-white/50"></div><div className="border-b border-white/50"></div>
                          <div className="border-r border-white/50"></div><div className="border-r border-white/50"></div><div></div>
                        </div>
                      </div>
                      <div className="w-full md:w-1/2 space-y-5 flex flex-col justify-center">
                        <div>
                          <div className="flex justify-between items-center mb-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zoom In</label><span className="text-xs text-blue-400 font-mono">{course.imageZoom}%</span></div>
                          <input type="range" min="0" max="100" step="1" value={course.imageZoom} onChange={e => setCourse({...course, imageZoom: parseInt(e.target.value)})} className="accent-blue-500 w-full cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pan Horizontal</label><span className="text-xs text-blue-400 font-mono">{course.imageX > 0 ? '+' : ''}{course.imageX}</span></div>
                          <input type="range" min="-50" max="50" step="1" value={course.imageX} onChange={e => setCourse({...course, imageX: parseInt(e.target.value)})} className="accent-purple-500 w-full cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pan Vertical</label><span className="text-xs text-blue-400 font-mono">{course.imageY > 0 ? '+' : ''}{course.imageY}</span></div>
                          <input type="range" min="-50" max="50" step="1" value={course.imageY} onChange={e => setCourse({...course, imageY: parseInt(e.target.value)})} className="accent-emerald-500 w-full cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" />
                        </div>
                        <button type="button" onClick={() => setCourse({...course, imageZoom: 0, imageX: 0, imageY: 0})} className="w-full mt-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 py-2 rounded-lg uppercase tracking-widest">Reset Framing</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Skill Domain *</label>
                    <select className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer" value={course.rewardSkill} onChange={e => setCourse({...course, rewardSkill: e.target.value})}>
                      <option value="" disabled>Select Target Skill...</option>
                      {PLATFORM_SKILLS.map(skill => <option key={skill} value={skill}>{skill}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">RP Yield</label>
                    <input type="number" min="10" step="10" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono" value={course.rewardRp} onChange={e => setCourse({...course, rewardRp: parseInt(e.target.value)})} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full">
              <div className="flex justify-between items-center border-b border-slate-700/50 pb-4 mb-6">
                <h2 className="text-xl font-bold">Module Architecture</h2>
                <button onClick={addModule} className="text-blue-400 hover:text-blue-300 font-bold text-sm bg-blue-500/10 px-4 py-2 rounded-lg">+ Add Module</button>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {modules.map((mod, index) => (
                  <div key={index} className={`border rounded-xl transition-all duration-300 overflow-hidden ${expandedModule === index ? 'bg-slate-900/80 border-blue-500/50 shadow-lg' : 'bg-slate-800/40 border-slate-700 hover:border-slate-600 cursor-pointer'}`}>
                    <div className="p-4 flex justify-between items-center" onClick={() => setExpandedModule(index)}>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-mono font-bold text-xs bg-slate-900 px-2 py-1 rounded">M{index + 1}</span>
                        <h3 className={`font-bold ${mod.title ? 'text-white' : 'text-slate-500 italic'}`}>{mod.title || 'Untitled Module'}</h3>
                      </div>
                      <div className="flex gap-3 items-center">
                        {modules.length > 1 && expandedModule === index && <button onClick={(e) => { e.stopPropagation(); removeModule(index); }} className="text-xs text-red-400 font-bold uppercase px-2">Delete</button>}
                        <span className="text-slate-500 text-xl">{expandedModule === index ? '▾' : '▸'}</span>
                      </div>
                    </div>
                    {expandedModule === index && (
                      <div className="p-5 pt-0 border-t border-slate-700/50 mt-2 space-y-5">
                        <div className="pt-4"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Module Title *</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm" value={mod.title} onChange={e => updateModule(index, 'title', e.target.value)} /></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Media URL (YouTube) - Optional</label><input type="url" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-blue-400 text-sm font-mono" value={mod.videoUrl} onChange={e => updateModule(index, 'videoUrl', e.target.value)} /></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Instructional Content *</label><textarea rows={4} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 text-sm resize-none" value={mod.content} onChange={e => updateModule(index, 'content', e.target.value)} /></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-xl font-bold border-b border-slate-700/50 pb-4">Verify Updates</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-slate-900/50 border border-slate-700 p-5 rounded-xl">
                    <div className="flex gap-4">
                      {course.coverImage && (
                        <div className="w-24 h-24 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                           <img src={course.coverImage} alt="Cover" className="w-full h-full object-cover" style={getTransformStyle() ? { transform: getTransformStyle() } : undefined} onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                      )}
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Title</h3><p className="text-lg font-bold text-white">{course.title}</p>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4">Description</h3><p className="text-sm text-slate-300 leading-relaxed">{course.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-900/50 border border-slate-700 p-5 rounded-xl text-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Metrics</h3>
                    <div className="flex justify-center gap-4">
                      <div><span className="block text-2xl font-extrabold text-blue-400">{course.rewardRp}</span><span className="text-[10px] uppercase text-slate-500 font-bold">RP Yield</span></div><div className="w-px bg-slate-700"></div>
                      <div><span className="block text-2xl font-extrabold text-white">{modules.length}</span><span className="text-[10px] uppercase text-slate-500 font-bold">Modules</span></div>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-700 p-5 rounded-xl text-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verified Skill</h3>
                    <span className="inline-block bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded text-sm font-bold uppercase tracking-wider">{course.rewardSkill}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-700/50 pt-6 mt-8 flex justify-between items-center">
            <button onClick={prevStep} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>&larr; Back</button>
            {currentStep < 3 ? (
              <button onClick={nextStep} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg">Continue &rarr;</button>
            ) : (
              <button onClick={handleUpdate} disabled={isPublishing} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg disabled:opacity-50 flex items-center gap-2">{isPublishing ? 'Updating Course...' : '💾 Save Course Updates'}</button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}