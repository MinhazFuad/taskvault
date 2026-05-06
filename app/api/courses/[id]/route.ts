import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Note the type change: params is now a Promise
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // UNWRAP THE PROMISE HERE
    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    
    // URL search param for the user ID
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('userId');

    if (!studentId || !courseId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Fetch Course & Progress
    const [courseRows]: any = await pool.execute(
      `SELECT 
          C.Course_ID, C.Title, C.Description, C.Total_Modules, C.Reward_RP, C.Reward_Skill,
          COALESCE(P.Completed_Modules, 0) AS Completed_Modules,
          COALESCE(P.Is_Completed, 0) AS Is_Completed
       FROM Courses C
       LEFT JOIN Student_Course_Progress P 
          ON C.Course_ID = P.Course_ID AND P.Student_ID = ?
       WHERE C.Course_ID = ?`,
      [studentId, courseId]
    );

    if (courseRows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // 2. Fetch Modules
    const [moduleRows]: any = await pool.execute(
      `SELECT Module_ID, Module_Order, Title, Content 
       FROM Course_Modules 
       WHERE Course_ID = ? 
       ORDER BY Module_Order ASC`,
      [courseId]
    );

    return NextResponse.json({ 
      success: true, 
      data: { 
        course: courseRows[0], 
        modules: moduleRows 
      } 
    }, { status: 200 });

  } catch (error) {
    console.error("Course Details Fetch Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}