import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getReminders, deleteRemindersForTask } from '@/lib/actions/reminders';

export async function GET(_: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  try {
    const id = parseInt(taskId);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    const reminders = await getReminders(id);
    return NextResponse.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  try {
    const id = parseInt(taskId);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    await deleteRemindersForTask(id);
    return NextResponse.json({ message: 'Reminders deleted' }, { status: 204 });
  } catch (error) {
    console.error('Error deleting reminders:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminders' },
      { status: 500 }
    );
  }
}