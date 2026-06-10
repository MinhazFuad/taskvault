import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const { applicationId, bountyId, studentId, corporateUserId } = await request.json();

    if (!applicationId || !bountyId || !studentId || !corporateUserId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    await connection.beginTransaction();

    // Lock bounty and verify ownership + status
    const [bountyRows]: any = await connection.execute(
      `SELECT Status, Experience_Level, Title
       FROM Bounties WHERE Bounty_ID = ? AND Corporate_User_ID = ? FOR UPDATE`,
      [bountyId, corporateUserId]
    );

    if (bountyRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Bounty not found or access denied.' }, { status: 404 });
    }

    const bounty = bountyRows[0];

    if (bounty.Status !== 'Open') {
      await connection.rollback();
      return NextResponse.json({ error: 'This bounty is no longer open.' }, { status: 400 });
    }

    // Check student has enough RP for stake
    const [studentRows]: any = await connection.execute(
      `SELECT Available_Rep_Points FROM Student_Metrics WHERE Student_ID = ? FOR UPDATE`,
      [studentId]
    );

    if (studentRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const STAKE: Record<string, number> = { Junior: 20, Intermediate: 40, Advanced: 80 };
    const stakeAmount = STAKE[bounty.Experience_Level] ?? 20;
    const studentRp = parseInt(studentRows[0].Available_Rep_Points) || 0;

    if (studentRp < stakeAmount) {
      await connection.rollback();
      return NextResponse.json({
        error: `Candidate no longer has enough RP to stake (needs ${stakeAmount}).`,
      }, { status: 400 });
    }

    // Get rejected applicants before updating
    const [rejectedRows]: any = await connection.execute(
      `SELECT Student_ID FROM Bounty_Applications
       WHERE Bounty_ID = ? AND Application_ID != ? AND Status = 'Pending'`,
      [bountyId, applicationId]
    );

    // Accept this application
    await connection.execute(
      `UPDATE Bounty_Applications SET Status = 'Accepted' WHERE Application_ID = ?`,
      [applicationId]
    );

    // Reject all other pending applications for this bounty
    await connection.execute(
      `UPDATE Bounty_Applications SET Status = 'Rejected'
       WHERE Bounty_ID = ? AND Application_ID != ?`,
      [bountyId, applicationId]
    );

    // Deduct RP stake from accepted student and move it to Staked_Rep_Points
    await connection.execute(
      `UPDATE Student_Metrics
       SET Available_Rep_Points = Available_Rep_Points - ?,
           Staked_Rep_Points    = Staked_Rep_Points    + ?
       WHERE Student_ID = ?`,
      [stakeAmount, stakeAmount, studentId]
    );

    // Assign the bounty
    await connection.execute(
      `UPDATE Bounties SET Status = 'Assigned', Assigned_Student_ID = ? WHERE Bounty_ID = ?`,
      [studentId, bountyId]
    );

    // Notify accepted student
    await connection.execute(
      `INSERT INTO Notifications (User_ID, Type, Title, Body, Link) VALUES (?, 'application_accepted', ?, ?, ?)`,
      [
        studentId,
        'Application Accepted!',
        `You've been selected for "${bounty.Title}". Head to your tasks to get started.`,
        '/dashboard/my-bounties',
      ]
    );

    // Notify rejected students
    for (const rejected of rejectedRows) {
      await connection.execute(
        `INSERT INTO Notifications (User_ID, Type, Title, Body, Link) VALUES (?, 'application_rejected', ?, ?, ?)`,
        [
          rejected.Student_ID,
          'Application Not Selected',
          `Another candidate was chosen for "${bounty.Title}". Keep applying!`,
          '/dashboard/bounties',
        ]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: 'Candidate selected and bounty assigned.' }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    console.error('Accept Application Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
