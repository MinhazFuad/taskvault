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

    // 1. Lock and inspect the bounty
    const [bountyRows]: any = await connection.execute(
      `SELECT Status, Required_RP, Required_Skill, Experience_Level FROM Bounties WHERE Bounty_ID = ? FOR UPDATE`,
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

    const STAKE: Record<string, number> = { Junior: 20, Intermediate: 40, Advanced: 80 };
    const stakeAmount = STAKE[bounty.Experience_Level] ?? 20;

    // 2. Lock and fetch the student's metrics (RP + cooldown)
    const [studentRows]: any = await connection.execute(
      `SELECT Available_Rep_Points, Cooldown_Until FROM Student_Metrics WHERE Student_ID = ? FOR UPDATE`,
      [studentId]
    );

    const studentRp = studentRows.length > 0 ? parseInt(studentRows[0].Available_Rep_Points) : 0;

    // Block claim if the student is currently on cooldown
    if (studentRows.length > 0 && studentRows[0].Cooldown_Until) {
      const cooldownEnd = new Date(studentRows[0].Cooldown_Until);
      if (cooldownEnd > new Date()) {
        await connection.rollback();
        const until = cooldownEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return NextResponse.json({
          error: `Your account is on a 7-day penalty cooldown until ${until}. You cannot claim new bounties during this period.`
        }, { status: 403 });
      }
    }

    // 3. Reality Check A: Verify Tier Threshold
    if (studentRp < bounty.Required_RP) {
      await connection.rollback();
      return NextResponse.json({
        error: `Tier Check Failed. This bounty requires ${bounty.Required_RP} RP, but your usable balance is ${studentRp} RP.`
      }, { status: 403 });
    }

    // 3b. Verify the student has enough RP to cover the stake
    if (studentRp < stakeAmount) {
      await connection.rollback();
      return NextResponse.json({
        error: `Insufficient RP. Claiming this ${bounty.Experience_Level} bounty stakes ${stakeAmount} RP, but you only have ${studentRp} RP available.`
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

    // 5. Deduct the staked RP from the student's available pool
    await connection.execute(
      `UPDATE Student_Metrics
       SET Available_Rep_Points = Available_Rep_Points - ?
       WHERE Student_ID = ?`,
      [stakeAmount, studentId]
    );

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