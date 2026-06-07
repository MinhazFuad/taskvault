import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows]: any = await pool.execute(
      `SELECT 
          U.User_ID,
          U.Full_Name,
          SM.Available_Rep_Points,
          SM.Total_Bounties_Completed,
          CASE 
            WHEN SM.Available_Rep_Points >= 1001 THEN 'Advanced'
            WHEN SM.Available_Rep_Points >= 401 THEN 'Intermediate'
            ELSE 'Junior'
          END AS Skill_Level
       FROM Users U
       JOIN Student_Metrics SM ON U.User_ID = SM.Student_ID
       WHERE U.Role = 'Student'
       ORDER BY SM.Available_Rep_Points DESC, SM.Total_Bounties_Completed DESC`
    );

    return NextResponse.json({ success: true, data: rows }, { status: 200 });
  } catch (error) {
    console.error("Leaderboards API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}