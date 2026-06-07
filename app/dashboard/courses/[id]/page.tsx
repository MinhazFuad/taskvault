'use client';
import { useState, useEffect, use } from 'react';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

export default function CourseViewer({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;
  const [courseData, setCourseData] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCourseData = async () => {
    const res = await fetch(`/api/courses/${courseId}?t=${Date.now()}`);
    const json = await res.json();
    if (json.success) {
      setCourseData(json);
      setActiveModule(json.modules[0]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCourseData(); }, [courseId]);

  if (loading) return <div className="text-white p-20 text-center">Loading...</div>;

  const { course, modules } = courseData;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <TopNav role="Student" />
      
      {/* Banner - Using simple object-cover */}
      <div className="relative h-64 w-full bg-slate-800 overflow-hidden">
        {course.Cover_Image && (
          <img src={course.Cover_Image} className="w-full h-full object-cover opacity-60" alt="Banner" />
        )}
        <div className="absolute bottom-0 p-8">
          <h1 className="text-4xl font-bold">{course.Title}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-3 gap-8">
        <div className="col-span-1 space-y-2">
          {modules.map((m: any, i: number) => (
            <button 
              key={m.Module_ID}
              onClick={() => setActiveModule(m)}
              className={`w-full p-4 rounded-lg text-left ${activeModule?.Module_ID === m.Module_ID ? 'bg-blue-600' : 'bg-slate-800'}`}
            >
              {i + 1}. {m.Title}
            </button>
          ))}
        </div>

        <div className="col-span-2 bg-slate-800 p-8 rounded-xl">
          <h2 className="text-2xl font-bold mb-4">{activeModule?.Title}</h2>
          
          {activeModule?.Video_URL && (
            <iframe 
              className="w-full aspect-video mb-6 rounded-lg"
              src={activeModule.Video_URL.replace("watch?v=", "embed/")}
              allowFullScreen
            />
          )}
          
          <div className="text-slate-300">{activeModule?.Content}</div>
        </div>
      </div>
    </div>
  );
}