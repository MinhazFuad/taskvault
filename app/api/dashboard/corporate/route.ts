import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const corporateId = searchParams.get('id');

    if (!corporateId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Pull corporate metrics, wallet balances, and pending review count
    const [userRows]: any = await pool.execute(
      `SELECT 
          U.Full_Name, 
          C.Company_Name, 
          C.Verification_Status, 
          W.Available_Credits AS Fiat_Balance,
          W.Escrow_Balance,
          (
            SELECT COUNT(*) 
            FROM Bounties 
            WHERE Corporate_User_ID = ? AND Status = 'Under_Review'
          ) AS Pending_Reviews
       FROM Users U
       JOIN Corporate_Organizations C ON U.User_ID = C.User_ID
       LEFT JOIN User_Wallets W ON U.User_ID = W.User_ID
       WHERE U.User_ID = ?`,
      [corporateId, corporateId]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 });
    }

    // 2. Fetch active bounties requiring review or tracking
    const [bountyRows]: any = await pool.execute(
      `SELECT B.*, U.Full_Name AS Student_Name 
       FROM Bounties B
       LEFT JOIN Users U ON B.Assigned_Student_ID = U.User_ID
       WHERE B.Corporate_User_ID = ? AND B.Status IN ('Assigned', 'Under_Review')
       ORDER BY B.Status DESC, B.Created_At DESC`,
      [corporateId]
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