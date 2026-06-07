'use client';

import { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

export default function CoursesCatalog() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlatform() {
      try {
        const authRes = await fetch('/api/auth/me');
        const authJson = await authRes.json();
        
        if (!authJson.success) {
          window.location.href = '/login';
          return;
        }

        const realUserId = authJson.user.userId;
        const coursesRes = await fetch(`/api/courses?userId=${realUserId}`);
        const coursesJson = await coursesRes.json();

        if (coursesJson.success) {
          setCourses(coursesJson.data.filter((c: any) => !c.Is_Completed));
        } else {
          setError(coursesJson.error || "Failed to load courses");
        }
      } catch (err: any) {
        setError(err.message || "Network Error");
      } finally {
        setLoading(false);
      }
    }
    
    loadPlatform();
  }, []);

  const getTransformStyle = (course: any) => {
    const zoom = course.Image_Zoom || 0;
    const x = course.Image_X || 0;
    const y = course.Image_Y || 0;
    if (zoom === 0 && x === 0 && y === 0) return undefined;
    const scale = 1 + (zoom / 50);
    return `scale(${scale}) translate(${x}%, ${y}%)`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col font-sans">
      <TopNav role="Student" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Skill Verification Courses</h1>
            <p className="text-slate-400 text-sm mt-1">Complete courses to earn Reputation Points (RP) and unlock Bounties.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-16 animate-pulse font-medium">Loading catalog...</div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 rounded-2xl p-6 text-red-400 text-center font-semibold">
            {error}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-5">🎓</div>
            <h2 className="text-xl font-bold text-white mb-2">All courses completed!</h2>
            <p className="text-slate-400 text-sm max-w-xs">You've finished everything in the catalog. Check back later for new courses.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => {
              const progressPercent = Math.min((course.Completed_Modules / course.Total_Modules) * 100, 100);
              const customTransform = getTransformStyle(course);
              
              return (
                <Link 
                  href={`/dashboard/courses/${course.Course_ID}`} 
                  key={course.Course_ID}
                  className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl hover:shadow-blue-500/20 group flex flex-col h-full"
                >
                  <div className="h-44 w-full bg-slate-900 overflow-hidden relative border-b border-slate-700/50">
                    {course.Cover_Image ? (
                      <img 
                        src={course.Cover_Image} 
                        alt={course.Title} 
                        className={`w-full h-full object-cover transition-transform duration-500 ${!customTransform ? 'group-hover:scale-[1.05]' : ''}`}
                        style={customTransform ? { transform: customTransform } : undefined}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-blue-900/40 to-purple-900/40 flex items-center justify-center">
                        <span className="text-4xl">📚</span>
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3">
                      {course.Is_Completed === 1 ? (
                        <span className="bg-emerald-500/90 backdrop-blur text-white text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg font-bold shadow-lg">
                          Completed
                        </span>
                      ) : progressPercent > 0 ? (
                        <span className="bg-blue-500/90 backdrop-blur text-white text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg font-bold shadow-lg">
                          In Progress
                        </span>
                      ) : null}
                    </div>

                    <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur text-slate-300 border border-slate-700 text-[10px] px-2 py-1 rounded uppercase tracking-wider font-bold">
                       {course.Reward_Skill}
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1 mb-2">
                      {course.Title}
                    </h2>
                    <p className="text-slate-400 text-sm mb-6 line-clamp-2 leading-relaxed flex-grow">
                      {course.Description}
                    </p>
                    
                    <div className="mt-auto">
                      <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <span>{course.Completed_Modules} / {course.Total_Modules} Modules</span>
                        <span className="text-blue-400">+{course.Reward_RP} RP</span>
                      </div>
                      <div className="w-full bg-slate-900/80 rounded-full h-2.5 border border-slate-700/50 overflow-hidden shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${course.Is_Completed === 1 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} 
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}