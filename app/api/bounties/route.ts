import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const corporateUserId = searchParams.get('corporateUserId');
    const status = searchParams.get('status');

    if (corporateUserId) {
      const [rows] = await pool.execute(
        `SELECT B.*, C.Company_Name 
         FROM Bounties B
         JOIN Corporate_Organizations C ON B.Corporate_User_ID = C.User_ID
         WHERE B.Corporate_User_ID = ? 
         ORDER BY B.Created_At DESC`,
        [corporateUserId]
      );
      return NextResponse.json({ success: true, data: rows }, { status: 200 });
    }

    if (status === 'Open') {
      const [rows] = await pool.execute(
        `SELECT B.*, C.Company_Name 
         FROM Bounties B
         JOIN Corporate_Organizations C ON B.Corporate_User_ID = C.User_ID
         WHERE B.Status = 'Open' 
         ORDER BY B.Created_At DESC`
      );
      return NextResponse.json({ success: true, data: rows }, { status: 200 });
    }

    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  } catch (error) {
    console.error("Bounties GET Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { corporateUserId, title, description, rewardAmount, experienceLevel, requiredSkill, dueDate } = await request.json();

    const amount = parseFloat(rewardAmount);

    if (!corporateUserId || !title || !description || isNaN(amount) || amount <= 0 || !requiredSkill || !experienceLevel || !dueDate) {
      return NextResponse.json({ error: 'All fields are required and reward amount must be greater than 0' }, { status: 400 });
    }

    // Map Corporate Experience Levels to your new strict RP thresholds
    let requiredRp = 0;
    if (experienceLevel === 'Intermediate') requiredRp = 301;
    if (experienceLevel === 'Advanced') requiredRp = 801;

    await connection.beginTransaction();

    const [walletRows]: any = await connection.execute(
      `SELECT Available_Credits FROM User_Wallets WHERE User_ID = ? FOR UPDATE`,
      [corporateUserId]
    );

    if (walletRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const availableCredits = parseFloat(walletRows[0].Available_Credits);

    if (availableCredits < amount) {
      await connection.rollback();
      return NextResponse.json({ error: 'Insufficient funds. Please deposit more credits to post this bounty.' }, { status: 400 });
    }

    await connection.execute(
      `UPDATE User_Wallets 
       SET Available_Credits = Available_Credits - ?, 
           Escrow_Balance = Escrow_Balance + ? 
       WHERE User_ID = ?`,
      [amount, amount, corporateUserId]
    );

    await connection.execute(
      `INSERT INTO Bounties (Corporate_User_ID, Title, Description, Reward_Amount, Experience_Level, Required_RP, Required_Skill, Due_Date, Status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open')`,
      [corporateUserId, title, description, amount, experienceLevel, requiredRp, requiredSkill, dueDate]
    );

    await connection.commit();

    return NextResponse.json({ success: true, message: 'Bounty posted and escrow locked' }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("Bounty Creation Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}