import { NextResponse } from 'next/server';
import pool from '@/lib/db';

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
    console.error('Notifications read PATCH Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
