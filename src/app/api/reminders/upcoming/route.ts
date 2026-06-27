import { NextRequest, NextResponse } from 'next/server';
import { getDueReminders } from '@/lib/actions/reminders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get reminders that are due or about to be due
    const now = new Date().toISOString();
    const cutoff = before || now;

    const db = require('@/lib/db').getDb();
    const reminders = db
      .prepare(
        `SELECT r.*, t.name as task_name, t.completed as task_completed
         FROM reminders r
         JOIN tasks t ON r.task_id = t.id
         WHERE r.remind_at <= ? AND t.completed = 0
         ORDER BY r.remind_at ASC
         LIMIT ?`
      )
      .all(cutoff, limit) as Array<{
        id: number;
        task_id: number;
        remind_at: string;
        created_at: string;
        task_name: string;
        task_completed: number;
      }>;

    return NextResponse.json(reminders);
  } catch (error) {
    console.error('Error fetching upcoming reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming reminders' },
      { status: 500 }
    );
  }
}