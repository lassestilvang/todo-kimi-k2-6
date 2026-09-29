import { NextRequest, NextResponse } from 'next/server';
import { parseVoiceCommand, executeVoiceIntent, logVoiceCommand } from '@/lib/actions/voice-control';
import { getCurrentUser } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transcript, execute } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'transcript required' }, { status: 400 });
    }

    const intent = await parseVoiceCommand(transcript);

    let result;
    if (execute) {
      result = await executeVoiceIntent(intent);
    }

    await logVoiceCommand({
      command: transcript,
      transcribed_text: transcript,
      action_taken: execute ? 'executed' : 'parsed',
      success: !!result?.success,
    });

    return NextResponse.json({ intent, result });
  } catch (error) {
    console.error('Error processing voice command:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
