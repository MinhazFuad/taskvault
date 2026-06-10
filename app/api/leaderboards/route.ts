import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows]: any = await pool.execute(
      `SELECT User_ID, Full_Name, Username, Profile_Picture,
              Available_Rep_Points, Total_Bounties_Completed,
              Avg_Rating, Rating_Count, Rank_Label, Position
       FROM v_student_leaderboard
       ORDER BY Position ASC`
    );

    return NextResponse.json({ success: true, data: rows }, { status: 200 });
  } catch (error) {
    console.error("Leaderboards API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}