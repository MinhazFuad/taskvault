import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const [userRows]: any = await pool.execute(
      `SELECT U.Full_Name, U.Email, U.Username, U.Role,
              U.Profile_Picture, U.Banner_Image, U.Bio,
              U.Headline, U.Location, U.LinkedIn_URL, U.GitHub_URL,
              U.Created_At,
              SM.Available_Rep_Points,
              CASE
                WHEN SM.Available_Rep_Points >= 1001 THEN 'Advanced'
                WHEN SM.Available_Rep_Points >= 401  THEN 'Intermediate'
                ELSE 'Junior'
              END AS Skill_Level,
              W.Available_Credits
       FROM Users U
       LEFT JOIN Student_Metrics SM ON U.User_ID = SM.Student_ID
       LEFT JOIN User_Wallets W ON U.User_ID = W.User_ID
       WHERE U.User_ID = ?`,
      [userId]
    );

    if (userRows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [courseRows]: any = await pool.execute(
      `SELECT C.Title, C.Reward_Skill, C.Reward_RP, P.Completed_At
       FROM Student_Course_Progress P
       JOIN Courses C ON P.Course_ID = C.Course_ID
       WHERE P.Student_ID = ? AND P.Is_Completed = 1
       ORDER BY P.Completed_At DESC`,
      [userId]
    );

    const skills = Array.from(new Set(courseRows.map((r: any) => r.Reward_Skill)));

    const [reviewRows]: any = await pool.execute(
      `SELECT B.Bounty_ID, B.Title, B.Corporate_Rating, B.Corporate_Review, B.Completed_At,
              COALESCE(CO.Company_Name, 'Anonymous Client') AS Company_Name
       FROM Bounties B
       LEFT JOIN Corporate_Organizations CO ON B.Corporate_User_ID = CO.User_ID
       WHERE B.Assigned_Student_ID = ? AND B.Status = 'Completed' AND B.Corporate_Rating IS NOT NULL
       ORDER BY B.Completed_At DESC`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...userRows[0],
        courses: courseRows,
        skills: skills,
        reviews: reviewRows,
      }
    });
  } catch (error) {
    console.error("Profile GET Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const formData = await request.formData();
    const userId      = formData.get('userId')      as string;
    const username    = formData.get('username')    as string | null;
    const bio         = formData.get('bio')         as string | null;
    const headline    = formData.get('headline')    as string | null;
    const location    = formData.get('location')    as string | null;
    const linkedinUrl = formData.get('linkedinUrl') as string | null;
    const githubUrl   = formData.get('githubUrl')   as string | null;

    const avatar = formData.get('avatar') as File | null;
    const banner = formData.get('banner') as File | null;

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    await mkdir(uploadDir, { recursive: true });

    let avatarPath = null;
    let bannerPath = null;

    if (avatar && avatar.size > 0) {
      const buffer = Buffer.from(await avatar.arrayBuffer());
      const filename = `avatar-${userId}-${Date.now()}${path.extname(avatar.name)}`;
      await writeFile(path.join(uploadDir, filename), buffer);
      avatarPath = `/uploads/profiles/${filename}`;
    }

    if (banner && banner.size > 0) {
      const buffer = Buffer.from(await banner.arrayBuffer());
      const filename = `banner-${userId}-${Date.now()}${path.extname(banner.name)}`;
      await writeFile(path.join(uploadDir, filename), buffer);
      bannerPath = `/uploads/profiles/${filename}`;
    }

    const updates = [];
    const values = [];

    if (username    !== null) { updates.push("Username = ?");     values.push(username); }
    if (bio         !== null) { updates.push("Bio = ?");          values.push(bio); }
    if (headline    !== null) { updates.push("Headline = ?");     values.push(headline); }
    if (location    !== null) { updates.push("Location = ?");     values.push(location); }
    if (linkedinUrl !== null) { updates.push("LinkedIn_URL = ?"); values.push(linkedinUrl); }
    if (githubUrl   !== null) { updates.push("GitHub_URL = ?");   values.push(githubUrl); }
    if (avatarPath  !== null) { updates.push("Profile_Picture = ?"); values.push(avatarPath); }
    if (bannerPath  !== null) { updates.push("Banner_Image = ?"); values.push(bannerPath); }

    if (updates.length > 0) {
      values.push(userId);
      await connection.execute(
        `UPDATE Users SET ${updates.join(', ')} WHERE User_ID = ?`,
        values
      );
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully!' });

  } catch (error: any) {
    console.error("Profile POST Error:", error);
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}