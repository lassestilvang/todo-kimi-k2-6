import { NextRequest, NextResponse } from 'next/server';
import {
  generateDailyDigest,
  sendNotificationDigest,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
} from '@/lib/actions/notification-digest';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'digest') {
      const digest = await generateDailyDigest(user.id);
      return NextResponse.json(digest);
    }

    if (action === 'preferences') {
      const prefs = await getUserNotificationPreferences(user.id);
      return NextResponse.json(prefs);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, preferences } = body;

    if (action === 'send_digest') {
      const digest = await generateDailyDigest(user.id);
      const result = await sendNotificationDigest(user.id, digest);
      return NextResponse.json(result);
    }

    if (action === 'update_preferences' && preferences) {
      const result = await updateUserNotificationPreferences(user.id, preferences);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing notification action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
