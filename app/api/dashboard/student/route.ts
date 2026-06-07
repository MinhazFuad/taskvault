import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('id');

    if (!studentId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const [userRows]: any = await pool.execute(
      `SELECT
          U.Full_Name,
          SM.Available_Rep_Points,
          SM.Cooldown_Until,
          CASE
            WHEN SM.Available_Rep_Points >= 801 THEN 'Advanced'
            WHEN SM.Available_Rep_Points >= 301 THEN 'Intermediate'
            ELSE 'Junior'
          END AS Skill_Level,
          W.Available_Credits AS Fiat_Balance,
          (SELECT COALESCE(SUM(Required_RP), 0)
           FROM Bounties
           WHERE Assigned_Student_ID = ? AND Status IN ('Assigned', 'Under_Review')
          ) AS Locked_RP,
          (SELECT COALESCE(ROUND(AVG(Corporate_Rating), 1), NULL)
           FROM Bounties
           WHERE Assigned_Student_ID = ? AND Corporate_Rating IS NOT NULL
          ) AS Avg_Talent_Rating,
          (SELECT COUNT(*)
           FROM Bounties
           WHERE Assigned_Student_ID = ? AND Corporate_Rating IS NOT NULL
          ) AS Total_Talent_Reviews
       FROM Users U
       LEFT JOIN Student_Metrics SM ON U.User_ID = SM.Student_ID
       LEFT JOIN User_Wallets W ON U.User_ID = W.User_ID
       WHERE U.User_ID = ?`,
      [studentId, studentId, studentId, studentId]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const [skillRows]: any = await pool.execute(
      `SELECT DISTINCT LOWER(TRIM(C.Reward_Skill)) AS Earned_Skill
       FROM Student_Course_Progress P
       JOIN Courses C ON P.Course_ID = C.Course_ID
       WHERE P.Student_ID = ? AND P.Is_Completed = 1`,
      [studentId]
    );
    const earnedSkills = skillRows.map((row: any) => row.Earned_Skill);

    const [bountyRows]: any = await pool.execute(
      `SELECT B.*, C.Company_Name
       FROM Bounties B
       JOIN Corporate_Organizations C ON B.Corporate_User_ID = C.User_ID
       WHERE B.Assigned_Student_ID = ?
       ORDER BY B.Created_At DESC`,
      [studentId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...userRows[0],
        earnedSkills,
        bounties: bountyRows
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
