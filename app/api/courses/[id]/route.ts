import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params;
    const [courseRows]: any = await pool.execute(
      `SELECT * FROM Courses WHERE Course_ID = ?`,
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const connection = await pool.getConnection();
  try {
    const { id: courseId } = await params;
    const { instructorId, title, description, coverImage, imageZoom, imageX, imageY, rewardRp, rewardSkill, modules } = await request.json();

    if (!instructorId || !title || !modules || modules.length === 0) {
      return NextResponse.json({ error: 'Missing required course data' }, { status: 400 });
    }

    const [ownerCheck]: any = await connection.execute(
      `SELECT Instructor_ID FROM Courses WHERE Course_ID = ?`,
      [courseId]
    );

    if (ownerCheck.length === 0) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (ownerCheck[0].Instructor_ID !== instructorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE Courses SET Title = ?, Description = ?, Cover_Image = ?, Image_Zoom = ?, Image_X = ?, Image_Y = ?, Total_Modules = ?, Reward_RP = ?, Reward_Skill = ? WHERE Course_ID = ?`,
      [title, description, coverImage || null, imageZoom || 0, imageX || 0, imageY || 0, modules.length, rewardRp, rewardSkill, courseId]
    );

    await connection.execute(`DELETE FROM Course_Modules WHERE Course_ID = ?`, [courseId]);

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      await connection.execute(
        `INSERT INTO Course_Modules (Course_ID, Module_Order, Title, Content, Video_URL) VALUES (?, ?, ?, ?, ?)`,
        [courseId, i + 1, mod.title, mod.content, mod.videoUrl ? mod.videoUrl.trim() : null]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
