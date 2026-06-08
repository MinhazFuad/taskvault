import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { bountyId, corporateId } = await request.json();

    if (!bountyId || !corporateId) return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });

    await connection.beginTransaction();

    const [bounty]: any = await connection.execute(
      `SELECT Assigned_Student_ID, Reward_Amount, Required_RP, Required_Skill 
       FROM bounties WHERE Bounty_ID = ? AND Corporate_User_ID = ? FOR UPDATE`,
      [bountyId, corporateId]
    );

    if (bounty.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Bounty not found or unauthorized' }, { status: 404 });
    }

    const { Assigned_Student_ID, Reward_Amount, Required_RP } = bounty[0];

    // Mark as completed and RECORD THE EXACT DATE
    await connection.execute(
      `UPDATE bounties SET Status = 'Completed', Completed_At = CURRENT_TIMESTAMP WHERE Bounty_ID = ?`,
      [bountyId]
    );

    if (Assigned_Student_ID) {
        await connection.execute(`UPDATE user_wallets SET Available_Credits = Available_Credits + ? WHERE User_ID = ?`, [Reward_Amount, Assigned_Student_ID]);
        await connection.execute(`UPDATE student_metrics SET Available_Rep_Points = Available_Rep_Points + ?, Total_Bounties_Completed = Total_Bounties_Completed + 1 WHERE Student_ID = ?`, [Required_RP || 0, Assigned_Student_ID]);
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