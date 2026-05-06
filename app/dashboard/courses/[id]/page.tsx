'use client';

import { useState, useEffect, use } from 'react';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

export default function CourseViewer({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const [userId, setUserId] = useState<number | null>(null);
  const [courseData, setCourseData] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCourseData = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();
      
      if (!authJson.success) {
        window.location.href = '/login';
        return;
      }

      const currentUserId = authJson.user.userId;
      setUserId(currentUserId); 

      const res = await fetch(`/api/courses/${courseId}?userId=${currentUserId}`);
      const json = await res.json();
      
      if (json.success) {
        setCourseData(json.data);
        const nextModuleIndex = Math.min(
          json.data.course.Completed_Modules, 
          json.data.modules.length - 1
        );
        setActiveModule(json.data.modules[nextModuleIndex]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const handleCompleteModule = async () => {
    if (!courseData || !userId || actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/courses/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: userId, courseId: courseData.course.Course_ID })
      });
      const json = await res.json();

      if (json.success) {
        if (json.courseCompleted) {
          alert(`Course Completed! You earned ${courseData.course.Reward_RP} RP.`);
        }
        await fetchCourseData(); 
      }
    } catch (error) {
      console.error("Action error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center">Loading course...</div>;
  if (!courseData) return <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center">Course not found.</div>;

  const { course, modules } = courseData;
  const progressPercent = Math.min((course.Completed_Modules / course.Total_Modules) * 100, 100);

  return (
    // Applied the gradient background here
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      <TopNav role="Student" />

      <div className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 py-6 px-8 flex justify-between items-center">
        <div>
          <Link href="/dashboard/courses" className="text-blue-400 text-sm hover:underline mb-2 inline-block">&larr; Back to Catalog</Link>
          <h1 className="text-2xl font-bold text-white">{course.Title}</h1>
        </div>
        <div className="text-right w-64">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Overall Progress</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-700">
            <div className={`h-2 rounded-full ${course.Is_Completed ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 max-w-7xl w-full mx-auto p-6 gap-8">
        <div className="w-1/3 flex flex-col gap-3 pr-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Course Modules</h2>
          
          {modules.map((mod: any, index: number) => {
            const isCompleted = index < course.Completed_Modules;
            const isLocked = index > course.Completed_Modules;
            const isCurrent = mod.Module_ID === activeModule?.Module_ID;

            return (
              <button 
                key={mod.Module_ID}
                onClick={() => !isLocked && setActiveModule(mod)}
                disabled={isLocked}
                className={`text-left p-4 rounded-lg border transition-all ${
                  isCurrent 
                    ? 'bg-blue-600/20 border-blue-500 text-white' 
                    : isLocked 
                      ? 'bg-slate-800/30 border-slate-800/50 text-slate-600 cursor-not-allowed' 
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">
                    {index + 1}. {mod.Title}
                  </span>
                  {isCompleted && <span className="text-emerald-500 text-xs">✓</span>}
                  {isLocked && <span className="text-slate-600 text-xs">🔒</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="w-2/3 flex flex-col">
          {activeModule ? (
            <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6">
                Module {activeModule.Module_Order}: {activeModule.Title}
              </h2>
              
              <div className="text-slate-300 text-lg leading-relaxed mb-12 bg-slate-900/50 p-6 rounded-lg border border-slate-700/50 min-h-[200px]">
                {activeModule.Content}
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-700">
                {activeModule.Module_Order <= course.Completed_Modules ? (
                  <button disabled className="bg-slate-700 text-slate-400 font-bold py-3 px-8 rounded-lg cursor-not-allowed flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Module Completed
                  </button>
                ) : (
                  <button 
                    onClick={handleCompleteModule}
                    disabled={actionLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Mark as Complete & Continue'}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}