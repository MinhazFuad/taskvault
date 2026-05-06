'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InstructorDashboard({ userId }: { userId: number }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyCourses() {
      try {
        // Fetch only courses created by this instructor
        const res = await fetch(`/api/courses?instructorId=${userId}&t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) setCourses(json.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchMyCourses();
  }, [userId]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Instructor Studio</h1>
        <Link 
          href="/dashboard/create-course" 
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg shadow-blue-500/30 transition-all"
        >
          + Draft New Course
        </Link>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">My Published Courses</h2>
        
        {loading ? (
          <p className="text-slate-400">Loading your catalog...</p>
        ) : courses.length === 0 ? (
          <p className="text-slate-500">You haven't published any courses yet. Click the button above to start.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div key={course.Course_ID} className="bg-slate-900 border border-slate-700 rounded-lg p-5">
                <h3 className="font-bold text-lg text-white mb-2">{course.Title}</h3>
                <p className="text-sm text-slate-400 mb-4">{course.Total_Modules} Modules • {course.Reward_RP} RP Reward</p>
                <div className="text-xs text-blue-400 font-semibold bg-blue-500/10 inline-block px-2 py-1 rounded">
                  Skill: {course.Reward_Skill}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}