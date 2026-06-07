import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { bountyId, corporateUserId, corporateRating, corporateReview } = await request.json();

    if (!bountyId || !corporateUserId) {
      return NextResponse.json({ error: 'Bounty ID and Corporate User ID are required' }, { status: 400 });
    }

    await connection.beginTransaction();

    const [bountyRows]: any = await connection.execute(
      `SELECT Corporate_User_ID, Assigned_Student_ID, Reward_Amount, Status, Experience_Level, Created_At, Due_Date, Submitted_At
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

    const STAKE: Record<string, number> = { Junior: 20, Intermediate: 40, Advanced: 80 };
    const stakeAmount = STAKE[bounty.Experience_Level] ?? 20;

    // ----- BONUS RP CALCULATION ENGINE -----
    const createdAt = new Date(bounty.Created_At).getTime();
    const dueDate = new Date(bounty.Due_Date).getTime();
    
    // Fallback to Date.now() if Submitted_At is missing for some reason
    const submittedAt = bounty.Submitted_At ? new Date(bounty.Submitted_At).getTime() : Date.now();

    const totalGivenTime = dueDate - createdAt;
    const timeTaken = submittedAt - createdAt;

    // Base 25% Bonus
    let bonusMultiplier = 0.25; 
    
    // +50% on top (75% total) if completed in half the time or less
    if (totalGivenTime > 0 && timeTaken <= (totalGivenTime / 2)) {
      bonusMultiplier = 0.75; 
    }

    const rpBonus = Math.floor(stakeAmount * bonusMultiplier);
    const totalRpToRefund = stakeAmount + rpBonus;
    // ---------------------------------------

    await connection.execute(
      `UPDATE User_Wallets 
       SET Escrow_Balance = Escrow_Balance - ? 
       WHERE User_ID = ?`,
      [rewardAmount, corporateUserId]
    );

    await connection.execute(
      `INSERT INTO User_Wallets (User_ID, Available_Credits, Escrow_Balance) 
       VALUES (?, ?, 0.00) 
       ON DUPLICATE KEY UPDATE Available_Credits = Available_Credits + ?`,
      [studentId, rewardAmount, rewardAmount]
    );

    // Persist optional ratings (Safeguard in case Corporate Rating UI isn't restored yet)
    const rating = corporateRating || null;
    const review = corporateReview || null;

    await connection.execute(
      `UPDATE Bounties 
       SET Status = 'Completed', Corporate_Rating = ?, Corporate_Review = ? 
       WHERE Bounty_ID = ?`,
      [rating, review, bountyId]
    );

    await connection.execute(
      `UPDATE Student_Metrics 
       SET Available_Rep_Points = Available_Rep_Points + ?,
           Total_Bounties_Completed = Total_Bounties_Completed + 1
       WHERE Student_ID = ?`,
      [totalRpToRefund, studentId]
    );

    await connection.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Deliverables approved! Escrow released and Candidate rewarded ${totalRpToRefund} RP (Stake + Bonus).` 
    }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    console.error("Payout Approval Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}