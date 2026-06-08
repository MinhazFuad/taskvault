import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/bounties/[bountyId]/applications?corporateUserId=X
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bountyId: string }> }
) {
  const { bountyId } = await params;
  const { searchParams } = new URL(request.url);
  const corporateUserId = searchParams.get('corporateUserId');

  if (!bountyId || !corporateUserId) {
    return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    // Verify corporate owns this bounty
    const [bountyCheck]: any = await connection.execute(
      `SELECT Bounty_ID FROM Bounties WHERE Bounty_ID = ? AND Corporate_User_ID = ?`,
      [bountyId, corporateUserId]
    );

    if (bountyCheck.length === 0) {
      return NextResponse.json({ error: 'Bounty not found or access denied.' }, { status: 404 });
    }

    // Get applicants with translated stats (no raw RP shown)
    const [applications]: any = await connection.execute(
      `SELECT
         ba.Application_ID,
         ba.Student_ID,
         ba.Cover_Letter,
         ba.Status,
         ba.Applied_At,
         u.Full_Name,
         u.Headline,
         sm.Total_Bounties_Completed,
         CASE
           WHEN sm.Available_Rep_Points >= 1001 THEN 'Advanced'
           WHEN sm.Available_Rep_Points >= 401  THEN 'Intermediate'
           ELSE 'Junior'
         END AS Tier,
         ROUND(AVG(
           CASE WHEN b2.Status = 'Completed' AND b2.Corporate_Rating IS NOT NULL
                THEN b2.Corporate_Rating END
         ), 1) AS Avg_Rating,
         COUNT(
           CASE WHEN b2.Status = 'Completed' AND b2.Corporate_Rating IS NOT NULL
                THEN 1 END
         ) AS Rating_Count
       FROM Bounty_Applications ba
       JOIN Users u ON ba.Student_ID = u.User_ID
       JOIN Student_Metrics sm ON ba.Student_ID = sm.Student_ID
       LEFT JOIN Bounties b2 ON b2.Assigned_Student_ID = ba.Student_ID
       WHERE ba.Bounty_ID = ? AND ba.Status = 'Pending'
       GROUP BY
         ba.Application_ID, ba.Student_ID, ba.Cover_Letter, ba.Status, ba.Applied_At,
         u.Full_Name, u.Headline, sm.Total_Bounties_Completed, sm.Available_Rep_Points
       ORDER BY ba.Applied_At ASC`,
      [bountyId]
    );

    // Attach verified skills for each applicant
    for (const app of applications) {
      const [skillRows]: any = await connection.execute(
        `SELECT DISTINCT c.Reward_Skill
         FROM Student_Course_Progress p
         JOIN Courses c ON p.Course_ID = c.Course_ID
         WHERE p.Student_ID = ? AND p.Is_Completed = 1
         ORDER BY c.Reward_Skill`,
        [app.Student_ID]
      );
      app.Skills = skillRows.map((r: any) => r.Reward_Skill);
    }

    return NextResponse.json({ success: true, data: applications });
  } catch (error) {
    console.error('Applications GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
