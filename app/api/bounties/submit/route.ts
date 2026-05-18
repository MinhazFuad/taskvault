import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const formData = await request.formData();
    
    const bountyIdStr = formData.get('bountyId') as string;
    const studentIdStr = formData.get('studentId') as string;
    const submissionText = formData.get('submissionText') as string || '';
    const file = formData.get('file') as File | null;

    const bountyId = parseInt(bountyIdStr);
    const studentId = parseInt(studentIdStr);

    if (isNaN(bountyId) || isNaN(studentId)) {
      return NextResponse.json({ error: 'Missing critical identification attributes.' }, { status: 400 });
    }

    if (submissionText.trim() === '' && (!file || file.size === 0)) {
      return NextResponse.json({ error: 'Payload empty: You must lodge either proof-of-work notes or attach deliverable assets.' }, { status: 400 });
    }

    await connection.beginTransaction();

    const [bountyRows]: any = await connection.execute(
      `SELECT Status, Assigned_Student_ID FROM Bounties WHERE Bounty_ID = ? FOR UPDATE`,
      [bountyId]
    );

    if (bountyRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Target bounty asset not found.' }, { status: 404 });
    }

    const bounty = bountyRows[0];

    if (bounty.Assigned_Student_ID !== studentId) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized override attempted.' }, { status: 403 });
    }

    if (bounty.Status !== 'Assigned') {
      await connection.rollback();
      return NextResponse.json({ error: 'Deliverables can only be lodged against actively mapped execution scopes.' }, { status: 400 });
    }

    let relativeFilePath = null;
    let originalFileName = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      originalFileName = cleanFileName;
      
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filenameOnDisk = `${uniqueSuffix}-${cleanFileName}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      
      await mkdir(uploadDir, { recursive: true });
      
      const absoluteFilePath = path.join(uploadDir, filenameOnDisk);
      await writeFile(absoluteFilePath, buffer);
      
      relativeFilePath = `/uploads/${filenameOnDisk}`;
    }

    // UPDATED: Now sets Submitted_At to track exact execution duration
    await connection.execute(
      `UPDATE Bounties 
       SET Status = 'Under_Review', 
           Submission_Text = ?, 
           Submission_File_Path = ?, 
           Submission_File_Name = ?,
           Submitted_At = CURRENT_TIMESTAMP
       WHERE Bounty_ID = ?`,
      [submissionText.trim(), relativeFilePath, originalFileName, bountyId]
    );

    await connection.commit();

    return NextResponse.json({ 
      success: true, 
      message: 'Deliverables lodged with asset attachments successfully!' 
    }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    console.error("Multipart Ingestion API Crash:", error);
    return NextResponse.json({ error: 'Internal File System or Transaction processing error' }, { status: 500 });
  } finally {
    connection.release();
  }
}