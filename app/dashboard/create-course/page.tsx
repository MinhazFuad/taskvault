'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CourseBuilder from '@/components/CourseBuilder';

export default function CreateCoursePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.user.role === 'Instructor') setUserId(d.user.userId);
        else router.push('/dashboard');
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 animate-pulse text-sm">
        Loading Studio…
      </div>
    );
  }
  if (!userId) return null;

  return <CourseBuilder mode="create" userId={userId} />;
}
