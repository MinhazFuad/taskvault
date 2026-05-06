import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Extract the user ID from the URL search parameters
    const { searchParams } = new URL(request.url);
    const corporateId = searchParams.get('id');

    if (!corporateId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const [rows]: any = await pool.execute(
      `SELECT 
          U.Full_Name, 
          C.Company_Name, 
          C.Verification_Status, 
          W.Available_Credits AS Fiat_Balance
       FROM Users U
       JOIN Corporate_Organizations C ON U.User_ID = C.User_ID
       LEFT JOIN User_Wallets W ON U.User_ID = W.User_ID
       WHERE U.User_ID = ?`,
      [corporateId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] }, { status: 200 });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}