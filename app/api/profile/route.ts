import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    // 1. Fetch User Base & Metrics
    const [userRows]: any = await pool.execute(
      `SELECT 
          U.User_ID, U.Full_Name, U.Email, U.Username, U.Bio, U.Profile_Picture, U.Banner_Picture,
          SM.Available_Rep_Points, SM.Total_Bounties_Completed,
          CASE 
            WHEN SM.Available_Rep_Points >= 801 THEN 'Advanced'
            WHEN SM.Available_Rep_Points >= 301 THEN 'Intermediate'
            ELSE 'Junior'
          END AS Skill_Level
       FROM Users U
       LEFT JOIN Student_Metrics SM ON U.User_ID = SM.Student_ID
       WHERE U.User_ID = ?`,
      [userId]
    );

    if (userRows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2. Fetch Completed Courses & Earned Skills
    const [courseRows]: any = await pool.execute(
      `SELECT C.Course_ID, C.Title, C.Reward_Skill, C.Reward_RP
       FROM Student_Course_Progress P
       JOIN Courses C ON P.Course_ID = C.Course_ID
       WHERE P.Student_ID = ? AND P.Is_Completed = 1`,
      [userId]
    );

    // Extract unique skills from completed courses
    const skills = Array.from(new Set(courseRows.map((c: any) => c.Reward_Skill.trim())));

    return NextResponse.json({ 
      success: true, 
      data: {
        ...userRows[0],
        completedCourses: courseRows,
        skills
      } 
    }, { status: 200 });

  } catch (error) {
    console.error("Profile GET Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const username = formData.get('username') as string || null;
    const bio = formData.get('bio') as string || null;
    
    const avatar = formData.get('avatar') as File | null;
    const banner = formData.get('banner') as File | null;

    if (!userId) return NextResponse.json({ error: 'User ID required for update' }, { status: 400 });

    await connection.beginTransaction();

    // Check if username is taken by someone else
    if (username) {
      const [existing]: any = await connection.execute(
        `SELECT User_ID FROM Users WHERE Username = ? AND User_ID != ?`,
        [username, userId]
      );
      if (existing.length > 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
      }
    }

    // Process File Uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    await mkdir(uploadDir, { recursive: true });

    let avatarPath = null;
    let bannerPath = null;

    if (avatar && avatar.size > 0) {
      const buffer = Buffer.from(await avatar.arrayBuffer());
      const filename = `avatar-${userId}-${Date.now()}.png`;
      await writeFile(path.join(uploadDir, filename), buffer);
      avatarPath = `/uploads/profiles/${filename}`;
    }

    if (banner && banner.size > 0) {
      const buffer = Buffer.from(await banner.arrayBuffer());
      const filename = `banner-${userId}-${Date.now()}.png`;
      await writeFile(path.join(uploadDir, filename), buffer);
      bannerPath = `/uploads/profiles/${filename}`;
    }

    // Dynamic SQL Update Construction
    let updateQuery = `UPDATE Users SET Username = ?, Bio = ?`;
    let queryParams: any[] = [username, bio];

    if (avatarPath) {
      updateQuery += `, Profile_Picture = ?`;
      queryParams.push(avatarPath);
    }
    if (bannerPath) {
      updateQuery += `, Banner_Picture = ?`;
      queryParams.push(bannerPath);
    }

    updateQuery += ` WHERE User_ID = ?`;
    queryParams.push(userId);

    await connection.execute(updateQuery, queryParams);
    await connection.commit();

    return NextResponse.json({ success: true, message: 'Profile updated successfully!' }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    console.error("Profile POST Error:", error);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  } finally {
    connection.release();
  }
}