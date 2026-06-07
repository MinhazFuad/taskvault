import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { studentId } = await request.json();
    if (!studentId) return NextResponse.json({ error: 'Student ID required' }, { status: 400 });

    await connection.beginTransaction();

    // Find all Assigned bounties past their due date for this student
    const [overdueRows]: any = await connection.execute(
      `SELECT Bounty_ID, Corporate_User_ID, Reward_Amount
       FROM Bounties
       WHERE Assigned_Student_ID = ? AND Status = 'Assigned' AND Due_Date < CURDATE()`,
      [studentId]
    );

    if (overdueRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: true, penalized: false, count: 0 });
    }

    // Cancel each expired bounty and refund corporate escrow back to available
    for (const bounty of overdueRows) {
      await connection.execute(
        `UPDATE Bounties SET Status = 'Cancelled' WHERE Bounty_ID = ?`,
        [bounty.Bounty_ID]
      );
      await connection.execute(
        `UPDATE User_Wallets
         SET Available_Credits = Available_Credits + ?,
             Escrow_Balance     = Escrow_Balance     - ?
         WHERE User_ID = ?`,
        [bounty.Reward_Amount, bounty.Reward_Amount, bounty.Corporate_User_ID]
      );
    }

    // Apply 15% RP penalty to student's current available pool.
    // The staked RP was already deducted at claim time and is not returned.
    const [metricsRows]: any = await connection.execute(
      `SELECT Available_Rep_Points FROM Student_Metrics WHERE Student_ID = ? FOR UPDATE`,
      [studentId]
    );
    const currentRp = metricsRows.length > 0 ? parseInt(metricsRows[0].Available_Rep_Points) : 0;
    const penalty = Math.floor(currentRp * 0.15);

    await connection.execute(
      `UPDATE Student_Metrics
       SET Available_Rep_Points = GREATEST(0, Available_Rep_Points - ?),
           Cooldown_Until        = DATE_ADD(NOW(), INTERVAL 7 DAY)
       WHERE Student_ID = ?`,
      [penalty, studentId]
    );

    await connection.commit();
    return NextResponse.json({ success: true, penalized: true, count: overdueRows.length, rpPenalty: penalty });
  } catch (error) {
    await connection.rollback();
    console.error('Process deadlines error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
