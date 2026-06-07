import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function verifyAdmin(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('taskvault_session')?.value;
  if (!token) return null;
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return payload.role === 'Admin' ? (payload.userId as number) : null;
}

// PATCH — admin takes action on an application
// body: { action: 'Interview_Called' | 'Rejected' | 'Email_Inquiry', message?: string }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const connection = await pool.getConnection();

  try {
    const adminId = await verifyAdmin();
    if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { action, message } = await request.json();

    const validActions = ['Interview_Called', 'Rejected', 'Email_Inquiry'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'Email_Inquiry' && !message?.trim()) {
      return NextResponse.json({ error: 'A message is required for email inquiries.' }, { status: 400 });
    }

    // Verify the application exists and is still Pending
    const [rows]: any = await connection.execute(
      `SELECT Application_ID, Status, Student_ID FROM Instructor_Applications WHERE Application_ID = ?`,
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    if (rows[0].Status !== 'Pending') {
      return NextResponse.json({ error: 'This application has already been reviewed.' }, { status: 409 });
    }

    await connection.execute(
      `UPDATE Instructor_Applications
       SET Status = ?, Admin_Feedback = ?
       WHERE Application_ID = ?`,
      [action, message?.trim() || null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin Applications PATCH Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
