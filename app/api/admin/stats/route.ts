import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('taskvault_session')?.value;
  if (!token) return false;
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return payload.role === 'Admin';
}

export async function GET() {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [[userStats]]: any = await pool.execute(`
      SELECT
        COUNT(*) AS Total_Users,
        SUM(CASE WHEN Role = 'Student'    THEN 1 ELSE 0 END) AS Total_Students,
        SUM(CASE WHEN Role = 'Corporate'  THEN 1 ELSE 0 END) AS Total_Corporate,
        SUM(CASE WHEN Role = 'Instructor' THEN 1 ELSE 0 END) AS Total_Instructors,
        SUM(CASE WHEN Role = 'Admin'      THEN 1 ELSE 0 END) AS Total_Admins,
        SUM(CASE WHEN Is_Banned = 1       THEN 1 ELSE 0 END) AS Total_Banned
      FROM Users
    `);

    const [[bountyStats]]: any = await pool.execute(`
      SELECT
        COUNT(*) AS Total_Bounties,
        SUM(CASE WHEN Status = 'Open'         THEN 1 ELSE 0 END) AS Open_Bounties,
        SUM(CASE WHEN Status = 'Assigned'     THEN 1 ELSE 0 END) AS Assigned_Bounties,
        SUM(CASE WHEN Status = 'Under_Review' THEN 1 ELSE 0 END) AS Under_Review_Bounties,
        SUM(CASE WHEN Status = 'Completed'    THEN 1 ELSE 0 END) AS Completed_Bounties,
        SUM(CASE WHEN Status = 'Cancelled'    THEN 1 ELSE 0 END) AS Cancelled_Bounties,
        COALESCE(SUM(CASE WHEN Status IN ('Assigned','Under_Review') THEN Reward_Amount ELSE 0 END), 0) AS Escrow_Locked,
        COALESCE(SUM(CASE WHEN Status = 'Completed' THEN Reward_Amount ELSE 0 END), 0) AS Escrow_Released,
        COALESCE(SUM(Reward_Amount), 0) AS Total_Bounty_Value
      FROM Bounties
    `);

    const [[courseStats]]: any = await pool.execute(`
      SELECT
        COUNT(*) AS Total_Courses,
        (SELECT COUNT(*) FROM Student_Course_Progress WHERE Is_Completed = 1) AS Total_Completions,
        (SELECT COUNT(*) FROM Student_Course_Progress) AS Total_Enrollments
      FROM Courses
    `);

    const [recentUsers]: any = await pool.execute(`
      SELECT U.User_ID, U.Full_Name, U.Email, U.Role, U.Is_Banned, U.Created_At,
             CO.Company_Name
      FROM Users U
      LEFT JOIN Corporate_Organizations CO ON U.User_ID = CO.User_ID
      ORDER BY U.Created_At DESC
      LIMIT 8
    `);

    return NextResponse.json({
      success: true,
      data: { userStats, bountyStats, courseStats, recentUsers }
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
