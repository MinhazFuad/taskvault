import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';

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

    await connection.execute(
      `INSERT INTO Users (Full_Name, Email, Password_Hash, Role) VALUES (?, ?, ?, ?)`,
      [fullName, email, passwordHash, role]
    );
    
    // trg_init_new_user trigger auto-provisions wallet, student_metrics, and corporate_organizations
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