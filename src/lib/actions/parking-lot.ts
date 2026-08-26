'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { sanitizeString } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export interface ParkedTask {
  id: number;
  name: string;
  description: string | null;
  date: string | null;
  priority: string;
  list_id: number;
  parked: number;
  parked_until: string | null;
  park_reason: string | null;
  cognitive_load: string;
  created_at: string;
}

/**
 * Move a task into the parking lot.
 */
export async function parkTask(input: {
  task_id: number;
  parked_until?: string | null;
  reason?: string | null;
}): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;

  const result = db
    .prepare(
      `UPDATE tasks
       SET parked = 1,
           parked_until = ?,
           park_reason = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
    .run(
      input.parked_until ?? null,
      sanitizeString(input.reason ?? '') ?? null,
      input.task_id,
      user.id
    );
  revalidatePath('/parking-lot');
  revalidatePath('/');
  return result.changes > 0;
}

/**
 * Pull a parked task back into active state.
 */
export async function unparkTask(taskId: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;

  const result = db
    .prepare(
      `UPDATE tasks
       SET parked = 0,
           parked_until = NULL,
           park_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
    .run(taskId, user.id);
  revalidatePath('/parking-lot');
  revalidatePath('/');
  return result.changes > 0;
}

/**
 * List all parked tasks for the current user.
 */
export async function listParkedTasks(): Promise<ParkedTask[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];

  return db
    .prepare(
      `SELECT id, name, description, date, priority, list_id,
              parked, parked_until, park_reason, cognitive_load, created_at
       FROM tasks
       WHERE user_id = ? AND parked = 1
       ORDER BY parked_until ASC NULLS LAST, created_at DESC`
    )
    .all(user.id) as ParkedTask[];
}

/**
 * Find resurrection candidates — parked tasks whose "until" date has elapsed
 * so we can surface them for re-evaluation.
 */
export async function getResurrectionCandidates(): Promise<
  Array<ParkedTask & { daysInLot: number }>
> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];

  return db
    .prepare(
      `SELECT id, name, description, date, priority, list_id,
              parked, parked_until, park_reason, cognitive_load, created_at,
              CAST(julianday('now') - julianday(coalesce(parked_until, created_at)) AS INTEGER) AS daysInLot
       FROM tasks
       WHERE user_id = ? AND parked = 1
         AND (
           parked_until IS NOT NULL AND date(parked_until) <= date('now')
           OR (parked_until IS NULL AND julianday('now') - julianday(created_at) > 90)
         )
       ORDER BY daysInLot DESC`
    )
    .all(user.id) as Array<ParkedTask & { daysInLot: number }>;
}

/**
 * Resurrect a parked task back into active state (alias of unparkTask for clarity).
 */
export async function resurrectTask(taskId: number): Promise<boolean> {
  return unparkTask(taskId);
}
