import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET ?userId=X → notifications + unread count
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId is required.' }, { status: 400 });

  const connection = await pool.getConnection();
  try {
    const [notifications]: any = await connection.execute(
      `SELECT * FROM Notifications WHERE User_ID = ? ORDER BY Created_At DESC LIMIT 25`,
      [userId]
    );

    const [countRow]: any = await connection.execute(
      `SELECT COUNT(*) AS unread FROM Notifications WHERE User_ID = ? AND Is_Read = 0`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount: countRow[0].unread,
    });
  } catch (error) {
    console.error('Notifications GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PATCH { userId, notificationId? } → mark as read (all if no id)
export async function PATCH(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { userId, notificationId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId is required.' }, { status: 400 });

    if (notificationId) {
      await connection.execute(
        `UPDATE Notifications SET Is_Read = 1 WHERE Notification_ID = ? AND User_ID = ?`,
        [notificationId, userId]
      );
    } else {
      await connection.execute(
        `UPDATE Notifications SET Is_Read = 1 WHERE User_ID = ?`,
        [userId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications PATCH Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
