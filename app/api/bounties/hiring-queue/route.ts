import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET ?corporateUserId=X → open bounties with pending applications
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const corporateUserId = searchParams.get('corporateUserId');

  if (!corporateUserId) {
    return NextResponse.json({ error: 'corporateUserId is required.' }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    const [rows]: any = await connection.execute(
      `SELECT
         b.Bounty_ID, b.Title, b.Reward_Amount, b.Experience_Level,
         b.Required_Skill, b.Due_Date, b.Created_At,
         COUNT(ba.Application_ID) AS Application_Count
       FROM Bounties b
       LEFT JOIN Bounty_Applications ba
         ON b.Bounty_ID = ba.Bounty_ID AND ba.Status = 'Pending'
       WHERE b.Corporate_User_ID = ? AND b.Status = 'Open'
       GROUP BY b.Bounty_ID, b.Title, b.Reward_Amount, b.Experience_Level,
                b.Required_Skill, b.Due_Date, b.Created_At
       HAVING COUNT(ba.Application_ID) > 0
       ORDER BY COUNT(ba.Application_ID) DESC, b.Created_At DESC`,
      [corporateUserId]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Hiring Queue Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
