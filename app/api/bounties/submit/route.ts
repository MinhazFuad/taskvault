import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { bountyId, studentId, submissionText } = await request.json();

    if (!bountyId || !studentId || !submissionText || submissionText.trim() === '') {
      return NextResponse.json({ error: 'Deliverables text/link cannot be empty' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Verify ownership and ensure status allows submission
    const [bountyRows]: any = await connection.execute(
      `SELECT Status, Assigned_Student_ID FROM Bounties WHERE Bounty_ID = ? FOR UPDATE`,
      [bountyId]
    );

    if (bountyRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    const bounty = bountyRows[0];

    if (bounty.Assigned_Student_ID !== studentId) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized. You are not assigned to this bounty.' }, { status: 403 });
    }

    if (bounty.Status !== 'Assigned') {
      await connection.rollback();
      return NextResponse.json({ error: 'Deliverables can only be submitted for active assigned tasks.' }, { status: 400 });
    }

    // 2. Write deliverables and shift state to Under Review
    await connection.execute(
      `UPDATE Bounties 
       SET Status = 'Under_Review', Submission_Text = ? 
       WHERE Bounty_ID = ?`,
      [submissionText.trim(), bountyId]
    );

    await connection.commit();

    return NextResponse.json({ success: true, message: 'Deliverables securely lodged for review!' }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    console.error("Submission API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}