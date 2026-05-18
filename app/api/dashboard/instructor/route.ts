import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instructorId = searchParams.get('id');

    if (!instructorId) {
      return NextResponse.json({ error: 'Instructor ID is required' }, { status: 400 });
    }

    // 1. Fetch Instructor Profile & Aggregate Metrics
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

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    // 2. Fetch Course Creation History Ledger
    const [courseRows]: any = await pool.execute(
      `SELECT Course_ID, Title, Description, Total_Modules, Reward_RP, Reward_Skill
       FROM Courses 
       WHERE Instructor_ID = ? 
       ORDER BY Course_ID DESC`,
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