import { NextRequest, NextResponse } from 'next/server';
import { createMeetingNotes, parseMeetingNotes, getMeetingNotes } from '@/lib/actions/meeting-assistant';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('id');

    if (meetingId) {
      // Get specific meeting
      const { getMeetingNotesById } = await import('@/lib/actions/meeting-assistant');
      const meeting = await getMeetingNotesById(Number(meetingId));
      if (!meeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }
      return NextResponse.json(meeting);
    }

    // Get all meetings
    const meetings = await getMeetingNotes();
    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error fetching meeting notes:', error);
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
    const { title, notes, date, participants, action_items, decisions } = body;

    // Create meeting notes
    const meeting = await createMeetingNotes({
      title,
      notes,
      date: date || undefined,
      participants,
      action_items,
      decisions,
    });

    // Parse and create action items from the notes
    const actionItems = await parseMeetingNotes(meeting.id);

    return NextResponse.json({
      meeting,
      actionItems,
      message: `Created meeting "${title}" with ${actionItems.length} action items`,
    });
  } catch (error) {
    console.error('Error creating meeting notes:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}