import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { courseId, instructorId } = await request.json();

    await connection.beginTransaction();

    // Verify ownership before deletion
    const [check]: any = await connection.execute(
      `SELECT Instructor_ID FROM Courses WHERE Course_ID = ? FOR UPDATE`,
      [courseId]
    );

    if (check.length === 0 || check[0].Instructor_ID !== instructorId) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete course (ensure cascading foreign keys exist in DB)
    await connection.execute(`DELETE FROM Courses WHERE Course_ID = ?`, [courseId]);

    await connection.commit();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    await connection.rollback();
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  } finally {
    connection.release();
  }
}