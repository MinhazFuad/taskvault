import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const STAKE: Record<string, number> = { Junior: 20, Intermediate: 40, Advanced: 80 };

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { bountyId, corporateId, corporateRating, corporateReview } = await request.json();

    if (!bountyId || !corporateId) return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });

    await connection.beginTransaction();

    const [bounty]: any = await connection.execute(
      `SELECT Assigned_Student_ID, Reward_Amount, Required_RP, Experience_Level
       FROM bounties WHERE Bounty_ID = ? AND Corporate_User_ID = ? FOR UPDATE`,
      [bountyId, corporateId]
    );

    if (bounty.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Bounty not found or unauthorized' }, { status: 404 });
    }

    const { Assigned_Student_ID, Reward_Amount, Experience_Level, Required_RP } = bounty[0];
    const stakeAmount = STAKE[Experience_Level] ?? 20;
    const bonusRp = Required_RP || 0;

    await connection.execute(
      `UPDATE bounties
       SET Status = 'Completed',
           Completed_At = CURRENT_TIMESTAMP,
           Corporate_Rating = ?,
           Corporate_Review = ?
       WHERE Bounty_ID = ?`,
      [corporateRating || null, corporateReview || null, bountyId]
    );

    // Release corporate escrow — funds already left Available_Credits when bounty was posted
    await connection.execute(
      `UPDATE user_wallets SET Escrow_Balance = Escrow_Balance - ? WHERE User_ID = ?`,
      [Reward_Amount, corporateId]
    );

    if (Assigned_Student_ID) {
      // Pay the student
      await connection.execute(
        `UPDATE user_wallets SET Available_Credits = Available_Credits + ? WHERE User_ID = ?`,
        [Reward_Amount, Assigned_Student_ID]
      );

      // Return staked RP + award bonus RP, clear stake tracking, increment completions
      await connection.execute(
        `UPDATE student_metrics
         SET Available_Rep_Points     = Available_Rep_Points    + ? + ?,
             Staked_Rep_Points        = GREATEST(0, Staked_Rep_Points - ?),
             Total_Bounties_Completed = Total_Bounties_Completed + 1
         WHERE Student_ID = ?`,
        [stakeAmount, bonusRp, stakeAmount, Assigned_Student_ID]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error("Approval Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}