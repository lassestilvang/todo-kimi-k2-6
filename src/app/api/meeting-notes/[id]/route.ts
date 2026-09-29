import { NextRequest, NextResponse } from 'next/server';
import {
  getMeetingNotesById,
  createActionItem,
  getActionItemsForMeeting,
  parseMeetingNotes,
} from '@/lib/actions/meeting-assistant';
import { getCurrentUser } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await params for Next.js 15 compatibility
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meeting = await getMeetingNotesById(Number(id));
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const actionItems = await getActionItemsForMeeting(Number(id));

    return NextResponse.json({
      meeting,
      actionItems,
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify meeting exists and belongs to user
    const meeting = await getMeetingNotesById(Number(id));
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'parse': {
        const actionItems = await parseMeetingNotes(Number(id));
        return NextResponse.json({ actionItems });
      }
      case 'convert': {
        const result = await convertToTasks(Number(id));

        return NextResponse.json({
          message: 'Converted action items to tasks',
          converted: result.created,
          existing: result.existing,
        });
      }
      default:
        // Create a new action item
        const actionItem = await createActionItem({
          meeting_notes_id: Number(id),
          description: body.description,
          due_date: body.due_date,
          priority: body.priority,
          assigned_to: body.assigned_to,
        });

        return NextResponse.json(actionItem);
    }
  } catch (error) {
    console.error('Error processing meeting action:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

// Helper function to convert action items to tasks
async function convertToTasks(meetingId: number) {
  const user = await getCurrentUser();
  const userId = user?.id ?? 0;

  const actionItems = await getActionItemsForMeeting(meetingId);

  let created = 0;
  let existing = 0;

  const database = getDb();

  for (const item of actionItems) {
    const existingTask = database
      .prepare('SELECT id FROM tasks WHERE name LIKE ? AND user_id = ?')
      .get(`%${item.description.substring(0, 30)}%`, userId);

    if (existingTask) {
      existing++;
      continue;
    }

    try {
      database.prepare(
        `INSERT INTO tasks
         (user_id, name, description, list_id, date, deadline, priority, completed, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).run(
        userId,
        item.description,
        `Action item from meeting #${meetingId}`,
        item.due_date || null,
        item.due_date || null,
        item.priority || 'medium',
      );
      created++;
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }

  return { created, existing };
}