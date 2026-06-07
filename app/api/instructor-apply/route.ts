import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const RP_THRESHOLD     = 3000;
const RATING_THRESHOLD = 4.8;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

    // Fetch the student's most recent application
    const [rows]: any = await pool.execute(
      `SELECT IA.Application_ID, IA.Status, IA.Admin_Feedback, IA.Applied_At, IA.Updated_At
       FROM Instructor_Applications IA
       WHERE IA.Student_ID = ?
       ORDER BY IA.Applied_At DESC
       LIMIT 1`,
      [studentId]
    );

    // Fetch current eligibility metrics
    const [[metrics]]: any = await pool.execute(
      `SELECT SM.Available_Rep_Points,
              COALESCE(ROUND(AVG(B.Corporate_Rating), 2), 0) AS Avg_Rating,
              COUNT(B.Corporate_Rating) AS Rating_Count
       FROM Student_Metrics SM
       LEFT JOIN Bounties B ON B.Assigned_Student_ID = SM.Student_ID AND B.Corporate_Rating IS NOT NULL
       WHERE SM.Student_ID = ?
       GROUP BY SM.Student_ID`,
      [studentId]
    );

    return NextResponse.json({
      success: true,
      data: {
        application: rows[0] || null,
        eligibility: {
          rp: Number(metrics?.Available_Rep_Points) || 0,
          rating: Number(metrics?.Avg_Rating) || 0,
          ratingCount: Number(metrics?.Rating_Count) || 0,
          meetsRp: (Number(metrics?.Available_Rep_Points) || 0) >= RP_THRESHOLD,
          meetsRating: (Number(metrics?.Avg_Rating) || 0) >= RATING_THRESHOLD,
        }
      }
    });
  } catch (error) {
    console.error('Instructor Apply GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { studentId } = await request.json();
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

    // Verify the user is actually a Student role
    const [[userRow]]: any = await pool.execute(
      `SELECT Role FROM Users WHERE User_ID = ?`, [studentId]
    );
    if (!userRow || userRow.Role !== 'Student') {
      return NextResponse.json({ error: 'Only students can apply.' }, { status: 403 });
    }

    // Check eligibility
    const [[metrics]]: any = await pool.execute(
      `SELECT SM.Available_Rep_Points,
              COALESCE(ROUND(AVG(B.Corporate_Rating), 2), 0) AS Avg_Rating
       FROM Student_Metrics SM
       LEFT JOIN Bounties B ON B.Assigned_Student_ID = SM.Student_ID AND B.Corporate_Rating IS NOT NULL
       WHERE SM.Student_ID = ?
       GROUP BY SM.Student_ID`,
      [studentId]
    );

    const rp     = Number(metrics?.Available_Rep_Points) || 0;
    const rating = Number(metrics?.Avg_Rating) || 0;

    if (rp < RP_THRESHOLD) {
      return NextResponse.json({
        error: `You need at least ${RP_THRESHOLD} RP to apply. You currently have ${rp} RP.`
      }, { status: 403 });
    }
    if (rating < RATING_THRESHOLD) {
      return NextResponse.json({
        error: `You need a minimum ${RATING_THRESHOLD}★ client rating to apply. Your current rating is ${rating}★.`
      }, { status: 403 });
    }

    // Block duplicate active applications
    const [existing]: any = await pool.execute(
      `SELECT Status FROM Instructor_Applications
       WHERE Student_ID = ? AND Status IN ('Pending', 'Interview_Called', 'Email_Inquiry')
       LIMIT 1`,
      [studentId]
    );
    if (existing.length > 0) {
      return NextResponse.json({
        error: 'You already have an active application under review.'
      }, { status: 409 });
    }

    await pool.execute(
      `INSERT INTO Instructor_Applications (Student_ID) VALUES (?)`,
      [studentId]
    );

    return NextResponse.json({ success: true, message: 'Application submitted successfully!' }, { status: 201 });
  } catch (error) {
    console.error('Instructor Apply POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
