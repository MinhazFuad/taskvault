import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { studentId, courseId } = await request.json();

    await connection.beginTransaction();

    // 1. Get Course Info
    const [courseData]: any = await connection.execute(
      `SELECT Total_Modules, Reward_RP FROM Courses WHERE Course_ID = ?`,
      [courseId]
    );
    const totalModules = courseData[0].Total_Modules;
    const rewardRp = courseData[0].Reward_RP;

    // 2. EXPLOIT PREVENTION: Check if already completed
    const [check]: any = await connection.execute(
      `SELECT Is_Completed FROM Student_Course_Progress WHERE Student_ID = ? AND Course_ID = ?`,
      [studentId, courseId]
    );

    if (check.length > 0 && check[0].Is_Completed) {
      await connection.rollback();
      return NextResponse.json({ error: 'RP already awarded for this course' }, { status: 403 });
    }

    // 3. Increment Progress
    await connection.execute(
      `INSERT INTO Student_Course_Progress (Student_ID, Course_ID, Completed_Modules)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE Completed_Modules = Completed_Modules + 1`,
      [studentId, courseId]
    );

    // 4. Fetch updated progress
    const [prog]: any = await connection.execute(
      `SELECT Completed_Modules FROM Student_Course_Progress WHERE Student_ID = ? AND Course_ID = ?`,
      [studentId, courseId]
    );
    const currentCompleted = prog[0].Completed_Modules;

    // 5. Completion Logic
    let courseCompleted = false;
    if (currentCompleted >= totalModules) {
      await connection.execute(
        `UPDATE Student_Course_Progress SET Is_Completed = TRUE WHERE Student_ID = ? AND Course_ID = ?`,
        [studentId, courseId]
      );
      
      // Award RP (Using INSERT ... ON DUPLICATE to fix broken legacy test accounts)
      await connection.execute(
        `INSERT INTO Student_Metrics (Student_ID, Available_Rep_Points) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE Available_Rep_Points = Available_Rep_Points + ?`,
        [studentId, rewardRp, rewardRp]
      );
      courseCompleted = true;
    }

    await connection.commit();
    return NextResponse.json({ success: true, courseCompleted }, { status: 200 });
  } catch (error) {
    await connection.rollback();
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}