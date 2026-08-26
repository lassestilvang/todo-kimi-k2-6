'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export interface ProcrastinationSignal {
  id: number;
  task_id: number;
  task_name: string;
  reschedule_count: number;
  days_since_created: number;
  severity: 'low' | 'medium' | 'high';
  suggested_action:
    | 'break_down'
    | 'park'
    | 'drop'
    | 'schedule_kickstart'
    | 'buddy'
    | 'keep_going';
  message: string;
}

/**
 * Scan the user's tasks and surface procrastination patterns.
 */
export async function detectProcrastination(): Promise<ProcrastinationSignal[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const rows = db
    .prepare(
      `SELECT id, name, reschedule_count, completed,
              CAST(julianday('now') - julianday(created_at) AS INTEGER) AS days_since_created,
              deadline, cognitive_load
       FROM tasks
       WHERE user_id = ? AND completed = 0
         AND (
           reschedule_count >= 2
           OR (deadline IS NOT NULL AND date(deadline) < date('now') AND reschedule_count >= 1)
           OR (CAST(julianday('now') - julianday(created_at) AS INTEGER) > 14
               AND priority IN ('critical', 'high')
               AND completed = 0)
         )
       ORDER BY reschedule_count DESC, days_since_created DESC`
    )
    .all(user.id) as Array<{
      id: number;
      name: string;
      reschedule_count: number;
      completed: number;
      days_since_created: number;
      deadline: string | null;
      cognitive_load: string | null;
    }>;

  const signals: ProcrastinationSignal[] = [];
  for (const r of rows) {
    let severity: ProcrastinationSignal['severity'] = 'low';
    let suggested_action: ProcrastinationSignal['suggested_action'] = 'keep_going';
    let message = '';

    if (r.reschedule_count >= 5 || r.days_since_created > 60) {
      severity = 'high';
    } else if (r.reschedule_count >= 3 || r.days_since_created > 30) {
      severity = 'medium';
    }

    if (r.reschedule_count >= 5 && r.cognitive_load === 'deep') {
      suggested_action = 'break_down';
      message = `You've rescheduled "${r.name}" ${r.reschedule_count} times. Try breaking it into 15-minute pieces.`;
    } else if (r.reschedule_count >= 4) {
      suggested_action = 'park';
      message = `"${r.name}" has been rescheduled ${r.reschedule_count} times. Consider parking it — guilt-free.`;
    } else if (
      r.deadline &&
      new Date(r.deadline) < new Date() &&
      r.reschedule_count >= 1
    ) {
      suggested_action = 'schedule_kickstart';
      message = `"${r.name}" is past deadline. Schedule a 30-min kickstart or drop it.`;
    } else if (r.days_since_created > 30) {
      suggested_action = 'buddy';
      message = `"${r.name}" has been open ${r.days_since_created} days. A buddy session might unstick it.`;
    } else if (r.reschedule_count >= 2) {
      suggested_action = 'break_down';
      message = `Rescheduled ${r.reschedule_count} times. Break into smaller steps?`;
    } else {
      continue;
    }

    signals.push({
      id: r.id,
      task_id: r.id,
      task_name: r.name,
      reschedule_count: r.reschedule_count,
      days_since_created: r.days_since_created,
      severity,
      suggested_action,
      message,
    });
  }

  return signals.slice(0, 10);
}

/**
 * Increment reschedule_count and stamp the timestamp.
 * Called from the reschedule flow (move / bump deadline).
 */
export async function bumpReschedule(taskId: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare(
      `UPDATE tasks
       SET reschedule_count = reschedule_count + 1,
           last_reschedule_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
    .run(taskId, user.id);
  revalidatePath('/');
  return result.changes > 0;
}
