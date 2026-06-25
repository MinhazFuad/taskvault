import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';
import { ResultSetHeader } from 'mysql2';

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { fullName, email, password, role } = await request.json();

    if (!fullName || !email || !password || !role) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // SECURITY LOCK: Only allow public registration for Students and Corporates
    if (role !== 'Student' && role !== 'Corporate') {
      return NextResponse.json({ error: 'Unauthorized role selection' }, { status: 403 });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await connection.beginTransaction();

    // 1. Insert the User and extract the auto-generated User_ID
    const [userResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (Full_Name, Email, Password_Hash, Role) VALUES (?, ?, ?, ?)`,
      [fullName, email, passwordHash, role]
    );
    
    const userId = userResult.insertId;

    // 2. Initialize the Wallet for all new users
    await connection.execute(
      `INSERT INTO user_wallets (User_ID, Available_Credits, Escrow_Balance) VALUES (?, 0.00, 0.00)`,
      [userId]
    );

    // 3. Provision Role-Specific Tables based on the selected role
    if (role === 'Student') {
      await connection.execute(
        `INSERT INTO student_metrics (Student_ID) VALUES (?)`,
        [userId]
      );
    } else if (role === 'Corporate') {
      const companyName = `${fullName} Inc.`;
      await connection.execute(
        `INSERT INTO corporate_organizations (User_ID, Company_Name) VALUES (?, ?)`,
        [userId, companyName]
      );
    }

    await connection.commit();
    return NextResponse.json({ message: 'User registered successfully', success: true }, { status: 201 });

  } catch (error: any) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    
  } finally {
    connection.release();
  }
}