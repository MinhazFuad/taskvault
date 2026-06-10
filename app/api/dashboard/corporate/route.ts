import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const corporateId = searchParams.get('id');

    if (!corporateId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const [userRows]: any = await pool.execute(
      `SELECT
          U.Full_Name,
          C.Company_Name,
          C.Verification_Status,
          W.Available_Credits AS Fiat_Balance,
          W.Escrow_Balance,
          (SELECT COALESCE(SUM(Reward_Amount), 0)
           FROM Bounties
           WHERE Corporate_User_ID = ? AND Status IN ('Open', 'Assigned', 'Under_Review')
          ) AS Funds_On_Hold,
          (SELECT COUNT(*)
           FROM Bounties
           WHERE Corporate_User_ID = ? AND Status = 'Under_Review'
          ) AS Pending_Reviews,
          (SELECT COALESCE(ROUND(AVG(Student_Rating), 1), NULL)
           FROM Bounties
           WHERE Corporate_User_ID = ? AND Student_Rating IS NOT NULL
          ) AS Avg_Client_Rating,
          (SELECT COUNT(*)
           FROM Bounties
           WHERE Corporate_User_ID = ? AND Student_Rating IS NOT NULL
          ) AS Total_Client_Reviews,
          (SELECT COUNT(*)
           FROM Bounties
           WHERE Corporate_User_ID = ?
          ) AS Total_Bounties_Posted
       FROM Users U
       JOIN Corporate_Organizations C ON U.User_ID = C.User_ID
       LEFT JOIN User_Wallets W ON U.User_ID = W.User_ID
       WHERE U.User_ID = ?`,
      [corporateId, corporateId, corporateId, corporateId, corporateId, corporateId]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 });
    }

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
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
