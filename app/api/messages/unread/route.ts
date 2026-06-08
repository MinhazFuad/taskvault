import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET ?userId=X  — total unread message count for TopNav badge
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ count: 0 });

  try {
    const [rows]: any = await pool.execute(
      `SELECT COUNT(*) AS count
       FROM Bounty_Messages bm
       JOIN Bounties b ON bm.Bounty_ID = b.Bounty_ID
       WHERE (b.Corporate_User_ID = ? OR b.Assigned_Student_ID = ?)
         AND bm.Sender_ID != ?
         AND bm.Is_Read = 0`,
      [userId, userId, userId]
    );
    return NextResponse.json({ count: parseInt(rows[0].count) || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
