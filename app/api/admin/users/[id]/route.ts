import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('taskvault_session')?.value;
  if (!token) return false;
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return payload.role === 'Admin';
}

// PATCH — edit user fields or toggle ban
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const connection = await pool.getConnection();

  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, email, role, isBanned } = body;

    await connection.beginTransaction();

    // Fetch current user state
    const [userRows]: any = await connection.execute(
      `SELECT User_ID, Role FROM Users WHERE User_ID = ?`,
      [id]
    );
    if (userRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentRole = userRows[0].Role;

    // Build dynamic UPDATE
    const updates: string[] = [];
    const values: any[] = [];

    if (fullName !== undefined) { updates.push('Full_Name = ?'); values.push(fullName); }
    if (email !== undefined)    { updates.push('Email = ?');     values.push(email); }
    if (role !== undefined)     { updates.push('Role = ?');      values.push(role); }
    if (isBanned !== undefined) { updates.push('Is_Banned = ?'); values.push(isBanned ? 1 : 0); }

    if (updates.length > 0) {
      values.push(id);
      await connection.execute(`UPDATE Users SET ${updates.join(', ')} WHERE User_ID = ?`, values);
    }

    // If role changed, ensure role-specific profile records exist
    if (role && role !== currentRole) {
      if (role === 'Student') {
        const [sm]: any = await connection.execute(
          `SELECT 1 FROM Student_Metrics WHERE Student_ID = ?`, [id]
        );
        if (sm.length === 0) {
          await connection.execute(`INSERT INTO Student_Metrics (Student_ID) VALUES (?)`, [id]);
        }
      } else if (role === 'Corporate') {
        const [co]: any = await connection.execute(
          `SELECT 1 FROM Corporate_Organizations WHERE User_ID = ?`, [id]
        );
        if (co.length === 0) {
          const [uRow]: any = await connection.execute(`SELECT Full_Name FROM Users WHERE User_ID = ?`, [id]);
          const companyName = `${uRow[0]?.Full_Name || 'Unknown'} Inc.`;
          await connection.execute(
            `INSERT INTO Corporate_Organizations (User_ID, Company_Name) VALUES (?, ?)`,
            [id, companyName]
          );
        }
      }

      // Ensure wallet exists for any role
      const [wallet]: any = await connection.execute(
        `SELECT 1 FROM User_Wallets WHERE User_ID = ?`, [id]
      );
      if (wallet.length === 0) {
        await connection.execute(`INSERT INTO User_Wallets (User_ID, Available_Credits) VALUES (?, 0.00)`, [id]);
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Email already in use by another account.' }, { status: 409 });
    }
    console.error('Admin PATCH User Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE — remove user and all associated data
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const connection = await pool.getConnection();

  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connection.beginTransaction();

    const [userRows]: any = await connection.execute(
      `SELECT Role FROM Users WHERE User_ID = ?`, [id]
    );
    if (userRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const role = userRows[0].Role;

    if (role === 'Student') {
      // Unassign bounties (return them to Open, refund corporate escrow already happened at assignment)
      await connection.execute(
        `UPDATE Bounties SET Status = 'Open', Assigned_Student_ID = NULL
         WHERE Assigned_Student_ID = ? AND Status IN ('Assigned', 'Under_Review')`,
        [id]
      );
      // Clear ratings left by this student on completed bounties
      await connection.execute(
        `UPDATE Bounties SET Student_Rating = NULL, Student_Review = NULL WHERE Assigned_Student_ID = ?`,
        [id]
      );
      await connection.execute(`DELETE FROM Student_Course_Progress WHERE Student_ID = ?`, [id]);
      await connection.execute(`DELETE FROM Student_Metrics WHERE Student_ID = ?`, [id]);
    }

    if (role === 'Corporate') {
      // Get all bounties this corporate posted
      const [bountyRows]: any = await connection.execute(
        `SELECT Bounty_ID, Assigned_Student_ID, Required_RP, Status FROM Bounties WHERE Corporate_User_ID = ?`,
        [id]
      );
      // Refund staked RP to any assigned students before deleting bounties
      for (const b of bountyRows) {
        if (b.Assigned_Student_ID && b.Required_RP > 0 && b.Status !== 'Completed') {
          await connection.execute(
            `UPDATE Student_Metrics SET Available_Rep_Points = Available_Rep_Points + ?
             WHERE Student_ID = ?`,
            [b.Required_RP, b.Assigned_Student_ID]
          );
        }
      }
      await connection.execute(`DELETE FROM Bounties WHERE Corporate_User_ID = ?`, [id]);
      await connection.execute(`DELETE FROM Corporate_Organizations WHERE User_ID = ?`, [id]);
    }

    if (role === 'Instructor') {
      const [courseRows]: any = await connection.execute(
        `SELECT Course_ID FROM Courses WHERE Instructor_ID = ?`, [id]
      );
      for (const c of courseRows) {
        await connection.execute(`DELETE FROM Student_Course_Progress WHERE Course_ID = ?`, [c.Course_ID]);
        await connection.execute(`DELETE FROM Course_Modules WHERE Course_ID = ?`, [c.Course_ID]);
      }
      await connection.execute(`DELETE FROM Courses WHERE Instructor_ID = ?`, [id]);
    }

    await connection.execute(`DELETE FROM User_Wallets WHERE User_ID = ?`, [id]);
    await connection.execute(`DELETE FROM Users WHERE User_ID = ?`, [id]);

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Admin DELETE User Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
