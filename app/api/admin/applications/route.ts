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

export async function GET(request: Request) {
  try {
    const adminId = await verifyAdmin();
    if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'All';

    let where = '';
    const params: any[] = [];
    if (statusFilter !== 'All') {
      where = 'AND IA.Status = ?';
      params.push(statusFilter);
    }

    const [rows]: any = await pool.execute(
      `SELECT
         IA.Application_ID, IA.Status, IA.Admin_Feedback, IA.Applied_At, IA.Updated_At,
         U.User_ID   AS Student_User_ID,
         U.Full_Name AS Student_Name,
         U.Email     AS Student_Email,
         U.Role      AS Student_Role,
         COALESCE(SM.Available_Rep_Points, 0) AS Rep_Points,
         COALESCE(ROUND(AVG(B.Corporate_Rating), 2), 0) AS Avg_Rating,
         COUNT(B.Corporate_Rating) AS Rating_Count,
         (SELECT COUNT(*) FROM Bounties WHERE Assigned_Student_ID = U.User_ID AND Status = 'Completed') AS Bounties_Done
       FROM Instructor_Applications IA
       JOIN Users U ON IA.Student_ID = U.User_ID
       LEFT JOIN Student_Metrics SM ON IA.Student_ID = SM.Student_ID
       LEFT JOIN Bounties B ON B.Assigned_Student_ID = IA.Student_ID AND B.Corporate_Rating IS NOT NULL
       WHERE 1=1 ${where}
       GROUP BY IA.Application_ID, IA.Status, IA.Admin_Feedback, IA.Applied_At, IA.Updated_At,
                U.User_ID, U.Full_Name, U.Email, U.Role, SM.Available_Rep_Points
       ORDER BY
         CASE IA.Status WHEN 'Pending' THEN 0 WHEN 'Email_Inquiry' THEN 1 WHEN 'Interview_Called' THEN 2 ELSE 3 END,
         IA.Applied_At DESC`,
      params
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Admin Applications GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
