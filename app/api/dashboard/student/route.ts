import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('id');

    if (!studentId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Fetch base metrics and aggregate locked RP
    const [userRows]: any = await pool.execute(
      `SELECT 
          U.Full_Name, 
          SM.Available_Rep_Points, 
          SM.Global_Elo_Rank, 
          W.Available_Credits AS Fiat_Balance,
          (
            SELECT COALESCE(SUM(Required_RP), 0) 
            FROM Bounties 
            WHERE Assigned_Student_ID = ? AND Status IN ('Assigned', 'Under_Review')
          ) AS Locked_RP
       FROM Users U
       LEFT JOIN Student_Metrics SM ON U.User_ID = SM.Student_ID
       LEFT JOIN User_Wallets W ON U.User_ID = W.User_ID
       WHERE U.User_ID = ?`,
      [studentId, studentId]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 2. Fetch active bounties assigned to this student
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
        bounties: bountyRows
      } 
    }, { status: 200 });

  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}