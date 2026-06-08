import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET ?userId=X
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId is required.' }, { status: 400 });

  try {
    const [rows]: any = await pool.execute(
      `SELECT
         b.Bounty_ID, b.Title, b.Status,
         b.Corporate_User_ID, b.Assigned_Student_ID,
         COALESCE(co.Company_Name, 'Client') AS Company_Name,
         COALESCE(other_user.Full_Name, 'Unknown') AS Other_Party_Name,
         (SELECT Content  FROM Bounty_Messages WHERE Bounty_ID = b.Bounty_ID ORDER BY Created_At DESC LIMIT 1) AS Last_Message,
         (SELECT Created_At FROM Bounty_Messages WHERE Bounty_ID = b.Bounty_ID ORDER BY Created_At DESC LIMIT 1) AS Last_Message_At,
         (SELECT COUNT(*) FROM Bounty_Messages WHERE Bounty_ID = b.Bounty_ID AND Sender_ID != ? AND Is_Read = 0) AS Unread_Count
       FROM Bounties b
       INNER JOIN Bounty_Messages bm ON b.Bounty_ID = bm.Bounty_ID
       LEFT JOIN Corporate_Organizations co ON b.Corporate_User_ID = co.User_ID
       LEFT JOIN Users other_user ON other_user.User_ID = IF(b.Corporate_User_ID = ?, b.Assigned_Student_ID, b.Corporate_User_ID)
       WHERE b.Corporate_User_ID = ? OR b.Assigned_Student_ID = ?
       GROUP BY b.Bounty_ID, b.Title, b.Status, b.Corporate_User_ID, b.Assigned_Student_ID, co.Company_Name, other_user.Full_Name
       ORDER BY Last_Message_At DESC`,
      [userId, userId, userId, userId]
    );

    const totalUnread = rows.reduce((sum: number, r: any) => sum + parseInt(r.Unread_Count || 0), 0);

    return NextResponse.json({ success: true, data: rows, totalUnread });
  } catch (error) {
    console.error('Messages inbox error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
