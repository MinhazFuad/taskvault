import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('userId');
    const instructorId = searchParams.get('instructorId'); // Look for instructor requests

    if (instructorId) {
      // IF AN INSTRUCTOR IS ASKING: Just get the courses they created
      const [rows] = await pool.execute(
        `SELECT * FROM Courses WHERE Instructor_ID = ? ORDER BY Course_ID DESC`,
        [instructorId]
      );
      return NextResponse.json({ success: true, data: rows }, { status: 200 });
    } 
    
    if (studentId) {
      // IF A STUDENT IS ASKING: Fetch the catalog and attach their personal progress
      const [rows] = await pool.execute(
        `SELECT 
            C.Course_ID, C.Title, C.Description, C.Total_Modules, C.Reward_RP, C.Reward_Skill,
            COALESCE(P.Completed_Modules, 0) AS Completed_Modules,
            COALESCE(P.Is_Completed, 0) AS Is_Completed
         FROM Courses C
         LEFT JOIN Student_Course_Progress P 
            ON C.Course_ID = P.Course_ID AND P.Student_ID = ?`,
        [studentId]
      );
      return NextResponse.json({ success: true, data: rows }, { status: 200 });
    }

    // If neither ID is provided
    return NextResponse.json({ error: 'A valid User ID or Instructor ID is required' }, { status: 400 });
    
  } catch (error: any) {
    console.error("Course Catalog API Error:", error);
    return NextResponse.json(
      { success: false, error: 'Database connection failed' }, 
      { status: 500 }
    );
  }
}