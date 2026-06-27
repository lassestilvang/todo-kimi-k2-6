import { NextRequest, NextResponse } from 'next/server';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  getUpcomingReminders,
} from '@/lib/actions/reminders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    const upcoming = searchParams.get('upcoming') === 'true';

    if (taskId) {
      const reminders = await getReminders(parseInt(taskId));
      return NextResponse.json(reminders);
    }

    if (upcoming) {
      const limit = parseInt(searchParams.get('limit') || '10');
      const reminderList = await getUpcomingReminders(limit);
      return NextResponse.json(reminderList);
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reminder = await createReminder(body);
    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create reminder' },
      { status: 400 }
    );
  }
}