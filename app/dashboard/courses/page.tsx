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
        const authText = await authRes.text();
        
        if (!authText) throw new Error("The /api/auth/me route returned an entirely blank response. Check if the file exists.");

        let authJson;
        try {
          authJson = JSON.parse(authText);
        } catch (e) {
          throw new Error(`The /api/auth/me route did not return JSON. It returned: ${authText.substring(0, 50)}...`);
        }
        
        if (!authJson.success) {
          window.location.href = '/login';
          return;
        }

        const realUserId = authJson.user.userId;

        const coursesRes = await fetch(`/api/courses?userId=${realUserId}`);
        const coursesText = await coursesRes.text();
        
        if (!coursesText) throw new Error("The /api/courses route returned an entirely blank response. Check if the file exists.");

        let coursesJson;
        try {
          coursesJson = JSON.parse(coursesText);
        } catch (e) {
          throw new Error(`The /api/courses route did not return JSON. It returned: ${coursesText.substring(0, 50)}...`);
        }

        if (coursesJson.success) {
          setCourses(coursesJson.data);
        } else {
          setError(coursesJson.error || "Failed to load courses");
        }

      } catch (err: any) {
        console.error("Platform Load Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadPlatform();
  }, []);

  return (
    // Applied the gradient background here
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      <TopNav role="Student" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Skill Verification Courses</h1>
          <p className="text-slate-400">Complete courses to earn Reputation Points (RP) and unlock Bounties.</p>
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading catalog...</div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-red-400 text-center font-semibold">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const progressPercent = Math.min((course.Completed_Modules / course.Total_Modules) * 100, 100);
              
              return (
                <Link 
                  href={`/dashboard/courses/${course.Course_ID}`} 
                  key={course.Course_ID}
                  className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 hover:border-blue-500 rounded-xl p-6 transition-all shadow-lg hover:shadow-blue-500/10 group flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                      {course.Title}
                    </h2>
                    {course.Is_Completed === 1 && (
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded font-semibold">Done</span>
                    )}
                  </div>
                  
                  <p className="text-slate-400 text-sm mb-6 flex-grow">{course.Description}</p>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>{course.Completed_Modules} / {course.Total_Modules} Modules</span>
                      <span>+{course.Reward_RP} RP</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-700">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${course.Is_Completed === 1 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
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