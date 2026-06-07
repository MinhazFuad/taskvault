'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CourseBuilder from '@/components/CourseBuilder';

export default function EditCoursePage() {
  const router   = useRouter();
  const params   = useParams();
  const courseId = params.id as string;

  const [userId,         setUserId]         = useState<number | null>(null);
  const [initialCourse,  setInitialCourse]  = useState<any>(null);
  const [initialModules, setInitialModules] = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    if (!courseId) return;
    async function init() {
      try {
        const authRes  = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (!authData.success || authData.user.role !== 'Instructor') { router.push('/dashboard'); return; }

        const uid = authData.user.userId;
        setUserId(uid);

        const courseRes  = await fetch(`/api/courses/${courseId}?t=${Date.now()}`);
        const courseData = await courseRes.json();
        if (!courseData.success) { router.push('/dashboard'); return; }
        if (courseData.course.Instructor_ID !== uid) { router.push('/dashboard'); return; }

        setInitialCourse({
          title:       courseData.course.Title        || '',
          description: courseData.course.Description  || '',
          coverImage:  courseData.course.Cover_Image  || '',
          imageZoom:   courseData.course.Image_Zoom   || 0,
          imageX:      courseData.course.Image_X      || 0,
          imageY:      courseData.course.Image_Y      || 0,
          rewardRp:    courseData.course.Reward_RP    || 50,
          rewardSkill: courseData.course.Reward_Skill || '',
        });

        setInitialModules(
          courseData.modules?.length
            ? courseData.modules.map((m: any) => ({
                title:    m.Title     || '',
                content:  m.Content   || '',
                videoUrl: m.Video_URL || '',
                quiz:     m.quiz      || null,
              }))
            : [{ title: '', content: '', videoUrl: '', quiz: null }]
        );
      } catch {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [courseId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 animate-pulse text-sm">
        Loading course…
      </div>
    );
  }
  if (!userId || !initialCourse) return null;

  return (
    <CourseBuilder
      mode="edit"
      courseId={courseId}
      userId={userId}
      initialCourse={initialCourse}
      initialModules={initialModules}
    />
  );
}
