import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const courseId = params.id;
    // Explicitly select Cover_Image
    const [courseRows]: any = await pool.execute(
      `SELECT *, Cover_Image FROM Courses WHERE Course_ID = ?`, 
      [courseId]
    );

    if (courseRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [moduleRows]: any = await pool.execute(
      `SELECT * FROM Course_Modules WHERE Course_ID = ? ORDER BY Module_Order ASC`, 
      [courseId]
    );

    return NextResponse.json({ success: true, course: courseRows[0], modules: moduleRows });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}