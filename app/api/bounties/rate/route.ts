import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { bountyId, studentId, rating, review } = await request.json();

    if (!bountyId || !studentId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Verify student owns this completed bounty and hasn't rated yet
    const [rows]: any = await pool.execute(
      `SELECT Bounty_ID FROM Bounties
       WHERE Bounty_ID = ? AND Assigned_Student_ID = ? AND Status = 'Completed' AND Student_Rating IS NULL`,
      [bountyId, studentId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Bounty not found, not completed, or already rated' }, { status: 400 });
    }

    await pool.execute(
      `UPDATE Bounties SET Student_Rating = ?, Student_Review = ? WHERE Bounty_ID = ?`,
      [ratingNum, review || null, bountyId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
