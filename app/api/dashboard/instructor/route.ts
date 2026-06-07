import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instructorId = searchParams.get('id');

    if (!instructorId) {
      return NextResponse.json({ error: 'Instructor ID is required' }, { status: 400 });
    }

    const [userRows]: any = await pool.execute(
      `SELECT
          U.Full_Name,
          U.Created_At AS Member_Since,
          (SELECT COUNT(*) FROM Courses WHERE Instructor_ID = ?) AS Total_Published,
          (SELECT COUNT(DISTINCT P.Student_ID)
           FROM Student_Course_Progress P
           JOIN Courses C ON P.Course_ID = C.Course_ID
           WHERE C.Instructor_ID = ?) AS Total_Students,
          (SELECT COUNT(*)
           FROM Student_Course_Progress P
           JOIN Courses C ON P.Course_ID = C.Course_ID
           WHERE C.Instructor_ID = ? AND P.Is_Completed = TRUE) AS Total_Completions,
          (SELECT COALESCE(SUM(C.Reward_RP), 0)
           FROM Student_Course_Progress P
           JOIN Courses C ON P.Course_ID = C.Course_ID
           WHERE C.Instructor_ID = ? AND P.Is_Completed = TRUE) AS Total_RP_Awarded
       FROM Users U
       WHERE U.User_ID = ?`,
      [instructorId, instructorId, instructorId, instructorId, instructorId]
    );

    const [courseRows]: any = await pool.execute(
      `SELECT
          C.Course_ID,
          C.Title,
          C.Description,
          C.Total_Modules,
          C.Reward_RP,
          C.Reward_Skill,
          (SELECT COUNT(*) FROM Student_Course_Progress
           WHERE Course_ID = C.Course_ID AND Is_Completed = TRUE) AS Completed_Count,
          (SELECT COUNT(*) FROM Student_Course_Progress
           WHERE Course_ID = C.Course_ID AND Is_Completed = FALSE) AS In_Progress_Count
       FROM Courses C
       WHERE C.Instructor_ID = ?
       ORDER BY C.Course_ID DESC`,
      [instructorId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...userRows[0],
        courses: courseRows,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Instructor Dashboard API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
