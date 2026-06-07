import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instructorId = searchParams.get('id');

    if (!instructorId) {
      return NextResponse.json({ error: 'Instructor ID is required' }, { status: 400 });
    }

    // 1. Fetch Aggregated Metrics
    const [userRows]: any = await pool.execute(
      `SELECT 
          U.Full_Name,
          (SELECT COUNT(*) FROM Courses WHERE Instructor_ID = ?) AS Total_Published,
          (SELECT COUNT(DISTINCT P.Student_ID) 
           FROM Student_Course_Progress P 
           JOIN Courses C ON P.Course_ID = C.Course_ID 
           WHERE C.Instructor_ID = ?) AS Total_Students
       FROM Users U
       WHERE U.User_ID = ?`,
      [instructorId, instructorId, instructorId]
    );

    // 2. Fetch Detailed Course History with Completion Stats
    const [courseRows]: any = await pool.execute(
      `SELECT C.Course_ID, C.Title, C.Description, C.Total_Modules, C.Reward_RP, C.Reward_Skill,
              (SELECT COUNT(*) FROM Student_Course_Progress WHERE Course_ID = C.Course_ID AND Is_Completed = TRUE) AS Completed_Count
       FROM Courses C
       WHERE C.Instructor_ID = ? 
       ORDER BY C.Course_ID DESC`,
      [instructorId]
    );

    return NextResponse.json({ 
      success: true, 
      data: {
        ...userRows[0],
        courses: courseRows
      } 
    }, { status: 200 });

  } catch (error) {
    console.error("Instructor Dashboard API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}