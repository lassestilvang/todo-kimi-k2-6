import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getUserAchievements, calculateUserLevel } from '@/lib/actions/gamification';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || 20);

    const [leaderboard, achievements, userStats] = await Promise.all([
      getLeaderboard(limit),
      getUserAchievements(user.id),
      calculateUserLevel(user.id),
    ]);

    return NextResponse.json({
      leaderboard,
      achievements,
      user: userStats,
    });
  } catch (error) {
    console.error('Error fetching gamification data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
