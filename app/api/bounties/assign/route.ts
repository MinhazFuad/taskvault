import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { bountyId, studentId } = await request.json();

    if (!bountyId || !studentId) {
      return NextResponse.json({ error: 'Bounty ID and Student ID are required' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Lock and inspect the bounty (Now pulling Required_Skill)
    const [bountyRows]: any = await connection.execute(
      `SELECT Status, Required_RP, Required_Skill FROM Bounties WHERE Bounty_ID = ? FOR UPDATE`,
      [bountyId]
    );

    if (bountyRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    const bounty = bountyRows[0];

    if (bounty.Status !== 'Open') {
      await connection.rollback();
      return NextResponse.json({ error: 'This bounty is no longer open for assignment' }, { status: 400 });
    }

    // 2. Lock and fetch the student's active Reputation Points securely
    const [studentRows]: any = await connection.execute(
      `SELECT Available_Rep_Points FROM Student_Metrics WHERE Student_ID = ? FOR UPDATE`,
      [studentId]
    );

    const studentRp = studentRows.length > 0 ? parseInt(studentRows[0].Available_Rep_Points) : 0;

    // 3. Reality Check A: Verify Tier Threshold
    if (studentRp < bounty.Required_RP) {
      await connection.rollback();
      return NextResponse.json({ 
        error: `Tier Check Failed. This bounty requires ${bounty.Required_RP} RP, but your usable balance is ${studentRp} RP.` 
      }, { status: 403 });
    }

    // 4. Reality Check B: Verify Exact Skill Match
    const requiredSkill = bounty.Required_Skill.toLowerCase().trim();
    const [skillRows]: any = await connection.execute(
      `SELECT 1 
       FROM Student_Course_Progress P
       JOIN Courses C ON P.Course_ID = C.Course_ID
       WHERE P.Student_ID = ? AND P.Is_Completed = 1 AND LOWER(TRIM(C.Reward_Skill)) = ?`,
      [studentId, requiredSkill]
    );

    if (skillRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ 
        error: `Skill Check Failed. You must complete a course granting the "${bounty.Required_Skill}" skill before claiming this task.` 
      }, { status: 403 });
    }

    // 5. Deduct the staked RP natively from the student's available pool
    if (bounty.Required_RP > 0) {
      await connection.execute(
        `UPDATE Student_Metrics 
         SET Available_Rep_Points = Available_Rep_Points - ? 
         WHERE Student_ID = ?`,
        [bounty.Required_RP, studentId]
      );
    }

    // 6. Assign the bounty to the student and update status
    await connection.execute(
      `UPDATE Bounties 
       SET Status = 'Assigned', Assigned_Student_ID = ? 
       WHERE Bounty_ID = ?`,
      [studentId, bountyId]
    );

    await connection.commit();

    return NextResponse.json({ success: true, message: 'Bounty successfully claimed and RP stake locked!' }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    console.error("Bounty Assignment Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}