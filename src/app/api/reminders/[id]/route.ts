import { NextRequest, NextResponse } from 'next/server';
import { updateReminder, deleteReminder } from '@/lib/actions/reminders';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const reminderId = parseInt(id);
    if (isNaN(reminderId)) {
      return NextResponse.json(
        { error: 'Invalid reminder ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const reminder = await updateReminder(reminderId, body);
    return NextResponse.json(reminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update reminder' },
      { status: 400 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const reminderId = parseInt(id);
    if (isNaN(reminderId)) {
      return NextResponse.json(
        { error: 'Invalid reminder ID' },
        { status: 400 }
      );
    }

    await deleteReminder(reminderId);
    return NextResponse.json({ message: 'Reminder deleted' }, { status: 204 });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}