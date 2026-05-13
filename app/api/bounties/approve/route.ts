import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { bountyId, corporateUserId } = await request.json();

    if (!bountyId || !corporateUserId) {
      return NextResponse.json({ error: 'Bounty ID and Corporate User ID are required' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Lock and verify the target bounty properties securely
    const [bountyRows]: any = await connection.execute(
      `SELECT Corporate_User_ID, Assigned_Student_ID, Reward_Amount, Status 
       FROM Bounties 
       WHERE Bounty_ID = ? FOR UPDATE`,
      [bountyId]
    );

    if (bountyRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    const bounty = bountyRows[0];

    if (bounty.Corporate_User_ID !== corporateUserId) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized. You do not own this bounty escrow.' }, { status: 403 });
    }

    if (bounty.Status !== 'Under_Review') {
      await connection.rollback();
      return NextResponse.json({ error: 'Bounty is not currently pending review approval.' }, { status: 400 });
    }

    const rewardAmount = parseFloat(bounty.Reward_Amount);
    const studentId = bounty.Assigned_Student_ID;

    // 2. Decrement the locked escrow capital directly from the corporate wallet
    await connection.execute(
      `UPDATE User_Wallets 
       SET Escrow_Balance = Escrow_Balance - ? 
       WHERE User_ID = ?`,
      [rewardAmount, corporateUserId]
    );

    // 3. FORTIFIED PAYOUT: Increment available balance for the assigned student.
    // Using an Upsert (ON DUPLICATE KEY) guarantees legacy/ghost accounts receive their funds perfectly.
    await connection.execute(
      `INSERT INTO User_Wallets (User_ID, Available_Credits, Escrow_Balance) 
       VALUES (?, ?, 0.00) 
       ON DUPLICATE KEY UPDATE Available_Credits = Available_Credits + ?`,
      [studentId, rewardAmount, rewardAmount]
    );

    // 4. Mark the bounty status as completely fulfilled
    await connection.execute(
      `UPDATE Bounties 
       SET Status = 'Completed' 
       WHERE Bounty_ID = ?`,
      [bountyId]
    );

    // 5. Update student performance metrics (Elo recalculation logic)
    // Increments completed bounties counter and upgrades base Elo status dynamically
    await connection.execute(
      `UPDATE Student_Metrics 
       SET Total_Bounties_Completed = Total_Bounties_Completed + 1,
           Global_Elo_Rank = CASE 
             WHEN Total_Bounties_Completed + 1 >= 10 THEN 'Master (Elo 2000+)'
             WHEN Total_Bounties_Completed + 1 >= 5 THEN 'Professional (Elo 1600+)'
             WHEN Total_Bounties_Completed + 1 >= 2 THEN 'Verified (Elo 1200+)'
             ELSE 'Novice (Elo 1000)'
           END
       WHERE Student_ID = ?`,
      [studentId]
    );

    await connection.commit();

    return NextResponse.json({ success: true, message: 'Deliverables approved! Escrow released to talent.' }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    console.error("Payout Approval Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}