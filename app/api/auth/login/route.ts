import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Find the user in the database
    const [rows]: any = await pool.execute(
      `SELECT User_ID, Full_Name, Password_Hash, Role FROM Users WHERE Email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = rows[0];

    // 2. Verify the password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.Password_Hash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Create the JWT Token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ 
        userId: user.User_ID, 
        role: user.Role,
        name: user.Full_Name 
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h') // Token expires in 24 hours
      .sign(secret);

    // 4. Create the response and set the HTTP-only cookie
    const response = NextResponse.json(
      { message: 'Login successful', success: true }, 
      { status: 200 }
    );

    response.cookies.set({
      name: 'taskvault_session',
      value: token,
      httpOnly: true, // Prevents JavaScript from reading the cookie (Security)
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;

  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}