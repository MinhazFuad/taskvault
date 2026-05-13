import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { userId, amount } = await request.json();

    const parsedAmount = parseFloat(amount);
    if (!userId || isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid deposit amount or User ID' }, { status: 400 });
    }

    await connection.beginTransaction();

    // Increment available credits securely
    await connection.execute(
      `UPDATE User_Wallets 
       SET Available_Credits = Available_Credits + ? 
       WHERE User_ID = ?`,
      [parsedAmount, userId]
    );

    // Fetch the updated balances
    const [walletRows]: any = await connection.execute(
      `SELECT Available_Credits, Escrow_Balance FROM User_Wallets WHERE User_ID = ?`,
      [userId]
    );

    await connection.commit();

    return NextResponse.json({ 
      success: true, 
      wallet: walletRows[0] 
    }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    console.error("Deposit API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}