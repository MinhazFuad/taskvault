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

export async function GET(request: Request) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'All';
    const search = searchParams.get('search') || '';

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (role !== 'All') {
      where += ' AND U.Role = ?';
      params.push(role);
    }

    if (search.trim()) {
      where += ' AND (U.Full_Name LIKE ? OR U.Email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [users]: any = await pool.execute(
      `SELECT
         U.User_ID, U.Full_Name, U.Email, U.Username, U.Role, U.Is_Banned, U.Created_At,
         U.Profile_Picture,
         COALESCE(SM.Available_Rep_Points, 0) AS Rep_Points,
         CO.Company_Name,
         COALESCE(W.Available_Credits, 0) AS Wallet_Balance,
         (SELECT COUNT(*) FROM Bounties WHERE Assigned_Student_ID = U.User_ID AND Status = 'Completed') AS Bounties_Completed,
         (SELECT COUNT(*) FROM Bounties WHERE Corporate_User_ID = U.User_ID) AS Bounties_Posted,
         (SELECT COUNT(*) FROM Courses WHERE Instructor_ID = U.User_ID) AS Courses_Created
       FROM Users U
       LEFT JOIN Student_Metrics SM ON U.User_ID = SM.Student_ID
       LEFT JOIN Corporate_Organizations CO ON U.User_ID = CO.User_ID
       LEFT JOIN User_Wallets W ON U.User_ID = W.User_ID
       ${where}
       ORDER BY U.Created_At DESC`,
      params
    );

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Admin Users GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
