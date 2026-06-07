import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { instructorId, title, description, rewardRp, rewardSkill, coverImage, imageZoom, imageX, imageY, modules } = await request.json();

    if (!instructorId || !title || !modules || modules.length === 0) {
      return NextResponse.json({ error: 'Missing required course data' }, { status: 400 });
    }

    await connection.beginTransaction();

    const [courseResult]: any = await connection.execute(
      `INSERT INTO Courses (Instructor_ID, Title, Description, Cover_Image, Image_Zoom, Image_X, Image_Y, Total_Modules, Reward_RP, Reward_Skill) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [instructorId, title, description, coverImage || null, imageZoom || 0, imageX || 0, imageY || 0, modules.length, rewardRp, rewardSkill]
    );

    const newCourseId = courseResult.insertId;

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      const videoUrl = mod.videoUrl ? mod.videoUrl.trim() : null;
      
      await connection.execute(
        `INSERT INTO Course_Modules (Course_ID, Module_Order, Title, Content, Video_URL) 
         VALUES (?, ?, ?, ?, ?)`,
        [newCourseId, i + 1, mod.title, mod.content, videoUrl]
      );
    }

    await connection.execute(`UPDATE Instructor_Profiles SET Total_Published = Total_Published + 1 WHERE Instructor_ID = ?`, [instructorId]);
    await connection.commit();
    return NextResponse.json({ success: true, courseId: newCourseId }, { status: 201 });

  } catch (error) {
    await connection.rollback();
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}