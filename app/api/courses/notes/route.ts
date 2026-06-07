import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const moduleId  = searchParams.get('moduleId');

  if (!studentId || !moduleId) {
    return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 });
  }

  try {
    const [rows]: any = await pool.execute(
      'SELECT Content FROM student_notes WHERE Student_ID = ? AND Module_ID = ?',
      [studentId, moduleId]
    );
    return NextResponse.json({ success: true, content: rows.length > 0 ? rows[0].Content : '' });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { studentId, moduleId, content } = await request.json();
    if (!studentId || !moduleId) {
      return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 });
    }

    await pool.execute(
      `INSERT INTO student_notes (Student_ID, Module_ID, Content)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE Content = VALUES(Content)`,
      [studentId, moduleId, content ?? '']
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
