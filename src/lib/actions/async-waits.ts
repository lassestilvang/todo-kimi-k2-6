'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { sanitizeString } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export interface AsyncWait {
  id: number;
  task_id: number;
  user_id: number;
  waiting_on: string;
  waiting_on_type:
    | 'person'
    | 'system'
    | 'event'
    | 'payment'
    | 'response';
  asked_at: string;
  expected_response_days: number;
  nudge_threshold_days: number;
  status: 'waiting' | 'nudged' | 'resolved' | 'abandoned';
  last_nudge_at: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  task_name?: string;
  days_elapsed?: number;
  nudge_due?: boolean;
}

/**
 * Mark a task as waiting on someone/something.
 */
export async function createAsyncWait(input: {
  task_id: number;
  waiting_on: string;
  waiting_on_type?: AsyncWait['waiting_on_type'];
  expected_response_days?: number;
  nudge_threshold_days?: number;
  notes?: string | null;
}): Promise<AsyncWait | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const waiting_on = sanitizeString(input.waiting_on) ?? '';
  if (!waiting_on) return null;

  const result = db
    .prepare(
      `INSERT INTO async_waits
         (task_id, user_id, waiting_on, waiting_on_type, asked_at,
          expected_response_days, nudge_threshold_days, notes, status)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, 'waiting')`
    )
    .run(
      input.task_id,
      user.id,
      waiting_on,
      input.waiting_on_type ?? 'person',
      input.expected_response_days ?? 3,
      input.nudge_threshold_days ?? 7,
      sanitizeString(input.notes ?? '') ?? null
    );

  revalidatePath('/async-waits');
  return db
    .prepare('SELECT * FROM async_waits WHERE id = ?')
    .get(result.lastInsertRowid) as AsyncWait;
}

/**
 * List active waits, joined with task names, with computed nudge flags.
 */
export async function listAsyncWaits(opts?: {
  status?: AsyncWait['status'];
}): Promise<AsyncWait[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];

  let sql = `
    SELECT w.*, t.name AS task_name,
           CAST(julianday('now') - julianday(w.asked_at) AS INTEGER) AS days_elapsed,
           CAST(julianday('now') - julianday(w.asked_at) AS INTEGER) >= w.nudge_threshold_days AS nudge_due
    FROM async_waits w
    JOIN tasks t ON t.id = w.task_id
    WHERE w.user_id = ?
  `;
  const params: Array<string | number> = [user.id];
  if (opts?.status) {
    sql += ' AND w.status = ?';
    params.push(opts.status);
  }
  sql += ' ORDER BY w.asked_at ASC';

  return db.prepare(sql).all(...params) as AsyncWait[];
}

/**
 * Mark that we sent a nudge (so we don't re-nudge constantly).
 */
export async function nudgeAsyncWait(id: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare(
      `UPDATE async_waits
       SET status = 'nudged', last_nudge_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
    .run(id, user.id);
  revalidatePath('/async-waits');
  return result.changes > 0;
}

/**
 * Resolve a wait — the response arrived or we gave up.
 */
export async function resolveAsyncWait(
  id: number,
  outcome: 'resolved' | 'abandoned'
): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare(
      `UPDATE async_waits
       SET status = ?, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
    .run(outcome, id, user.id);
  revalidatePath('/async-waits');
  return result.changes > 0;
}

/**
 * Daily job: find waits that have exceeded their nudge threshold and surface
 * a notification-worthy list. Called from a cron-like endpoint.
 */
export async function getWaitsNeedingNudge(): Promise<AsyncWait[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];

  return db
    .prepare(
      `SELECT w.*, t.name AS task_name,
              CAST(julianday('now') - julianday(w.asked_at) AS INTEGER) AS days_elapsed,
              1 AS nudge_due
       FROM async_waits w
       JOIN tasks t ON t.id = w.task_id
       WHERE w.user_id = ? AND w.status = 'waiting'
         AND julianday('now') - julianday(w.asked_at) >= w.nudge_threshold_days`
    )
    .all(user.id) as AsyncWait[];
}
