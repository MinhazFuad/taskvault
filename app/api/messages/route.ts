import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET ?bountyId=X&userId=Y
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bountyId = searchParams.get('bountyId');
  const userId   = searchParams.get('userId');

  if (!bountyId || !userId) {
    return NextResponse.json({ error: 'bountyId and userId are required.' }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    const [bountyRows]: any = await connection.execute(
      `SELECT b.Bounty_ID, b.Title, b.Status, b.Corporate_User_ID, b.Assigned_Student_ID,
              COALESCE(co.Company_Name, 'Client') AS Company_Name,
              other_user.Full_Name AS Other_Party_Name
       FROM Bounties b
       LEFT JOIN Corporate_Organizations co ON b.Corporate_User_ID = co.User_ID
       LEFT JOIN Users other_user ON other_user.User_ID = IF(b.Corporate_User_ID = ?, b.Assigned_Student_ID, b.Corporate_User_ID)
       WHERE b.Bounty_ID = ?
         AND (b.Corporate_User_ID = ? OR b.Assigned_Student_ID = ?)`,
      [userId, bountyId, userId, userId]
    );

    if (bountyRows.length === 0) {
      return NextResponse.json({ error: 'Bounty not found or access denied.' }, { status: 403 });
    }

    // Mark other party's messages as read
    await connection.execute(
      `UPDATE Bounty_Messages SET Is_Read = 1
       WHERE Bounty_ID = ? AND Sender_ID != ?`,
      [bountyId, userId]
    );

    const [messages]: any = await connection.execute(
      `SELECT bm.Message_ID, bm.Sender_ID, bm.Content, bm.Is_Read, bm.Created_At,
              u.Full_Name AS Sender_Name
       FROM Bounty_Messages bm
       JOIN Users u ON bm.Sender_ID = u.User_ID
       WHERE bm.Bounty_ID = ?
       ORDER BY bm.Created_At ASC`,
      [bountyId]
    );

    return NextResponse.json({ success: true, bounty: bountyRows[0], messages });
  } finally {
    connection.release();
  }
}

// POST { bountyId, senderId, content }
export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { bountyId, senderId, content } = await request.json();

    if (!bountyId || !senderId || !content?.trim()) {
      return NextResponse.json({ error: 'bountyId, senderId, and content are required.' }, { status: 400 });
    }

    const [bountyRows]: any = await connection.execute(
      `SELECT Bounty_ID, Status, Corporate_User_ID, Assigned_Student_ID
       FROM Bounties
       WHERE Bounty_ID = ?
         AND (Corporate_User_ID = ? OR Assigned_Student_ID = ?)`,
      [bountyId, senderId, senderId]
    );

    if (bountyRows.length === 0) {
      return NextResponse.json({ error: 'Bounty not found or access denied.' }, { status: 403 });
    }

    const bounty = bountyRows[0];
    if (!['Assigned', 'Under_Review'].includes(bounty.Status)) {
      return NextResponse.json({ error: 'Messaging is only available for active bounties.' }, { status: 400 });
    }

    await connection.execute(
      `INSERT INTO Bounty_Messages (Bounty_ID, Sender_ID, Content) VALUES (?, ?, ?)`,
      [bountyId, senderId, content.trim()]
    );

    return NextResponse.json({ success: true });
  } finally {
    connection.release();
  }
}
