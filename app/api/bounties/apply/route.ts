import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET ?studentId=X → list of bounties the student has applied to
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 });

  const connection = await pool.getConnection();
  try {
    const [rows]: any = await connection.execute(
      `SELECT ba.Bounty_ID, ba.Application_ID, ba.Status, ba.Applied_At,
              b.Title, b.Reward_Amount, b.Status AS Bounty_Status,
              co.Company_Name
       FROM Bounty_Applications ba
       JOIN Bounties b ON ba.Bounty_ID = b.Bounty_ID
       LEFT JOIN Corporate_Organizations co ON b.Corporate_User_ID = co.User_ID
       WHERE ba.Student_ID = ?
       ORDER BY ba.Applied_At DESC`,
      [studentId]
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Apply GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST { bountyId, studentId, coverLetter } → submit application
export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { bountyId, studentId, coverLetter } = await request.json();

    if (!bountyId || !studentId) {
      return NextResponse.json({ error: 'Bounty ID and Student ID are required.' }, { status: 400 });
    }

    await connection.beginTransaction();

    const [bountyRows]: any = await connection.execute(
      `SELECT b.Status, b.Required_RP, b.Required_Skill, b.Experience_Level,
              b.Title, b.Corporate_User_ID
       FROM Bounties b WHERE b.Bounty_ID = ? FOR UPDATE`,
      [bountyId]
    );

    if (bountyRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Bounty not found.' }, { status: 404 });
    }

    const bounty = bountyRows[0];

    if (bounty.Status !== 'Open') {
      await connection.rollback();
      return NextResponse.json({ error: 'This bounty is no longer accepting applications.' }, { status: 400 });
    }

    const [studentRows]: any = await connection.execute(
      `SELECT Available_Rep_Points, Cooldown_Until FROM Student_Metrics WHERE Student_ID = ?`,
      [studentId]
    );

    if (studentRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Student profile not found.' }, { status: 404 });
    }

    const student = studentRows[0];
    const studentRp = parseInt(student.Available_Rep_Points) || 0;

    if (student.Cooldown_Until && new Date(student.Cooldown_Until) > new Date()) {
      await connection.rollback();
      const until = new Date(student.Cooldown_Until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return NextResponse.json({ error: `Account on penalty cooldown until ${until}.` }, { status: 403 });
    }

    if (studentRp < bounty.Required_RP) {
      await connection.rollback();
      return NextResponse.json({ error: `This bounty requires ${bounty.Required_RP} RP. You have ${studentRp} RP.` }, { status: 403 });
    }

    const STAKE: Record<string, number> = { Junior: 20, Intermediate: 40, Advanced: 80 };
    const stakeAmount = STAKE[bounty.Experience_Level] ?? 20;
    if (studentRp < stakeAmount) {
      await connection.rollback();
      return NextResponse.json({ error: `You need at least ${stakeAmount} RP to stake on this bounty.` }, { status: 403 });
    }

    const [skillRows]: any = await connection.execute(
      `SELECT 1
       FROM Student_Course_Progress p
       JOIN Courses c ON p.Course_ID = c.Course_ID
       WHERE p.Student_ID = ? AND p.Is_Completed = 1
         AND LOWER(TRIM(c.Reward_Skill)) = ?`,
      [studentId, bounty.Required_Skill.toLowerCase().trim()]
    );

    if (skillRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({
        error: `You must complete a course granting the "${bounty.Required_Skill}" skill first.`,
      }, { status: 403 });
    }

    const [existing]: any = await connection.execute(
      `SELECT Application_ID FROM Bounty_Applications WHERE Bounty_ID = ? AND Student_ID = ?`,
      [bountyId, studentId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'You have already applied to this bounty.' }, { status: 400 });
    }

    await connection.execute(
      `INSERT INTO Bounty_Applications (Bounty_ID, Student_ID, Cover_Letter) VALUES (?, ?, ?)`,
      [bountyId, studentId, coverLetter?.trim() || null]
    );

    await connection.execute(
      `INSERT INTO Notifications (User_ID, Type, Title, Body, Link) VALUES (?, 'new_application', ?, ?, ?)`,
      [
        bounty.Corporate_User_ID,
        'New Application Received',
        `A student applied to "${bounty.Title}" — review candidates in the Hiring Queue.`,
        '/dashboard/submissions',
      ]
    );

    await connection.commit();
    return NextResponse.json({ success: true, message: 'Application submitted!' }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    console.error('Apply POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
