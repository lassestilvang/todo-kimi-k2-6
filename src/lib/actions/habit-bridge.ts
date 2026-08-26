'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export interface HabitBridge {
  id: number;
  user_id: number;
  habit_id: number;
  task_id: number;
  counts_for_both: number;
  created_at: string;
  habit_name?: string;
  task_name?: string;
}

/**
 * Link a habit with a (recurring) task so completing either counts for both.
 */
export async function bridgeHabitToTask(input: {
  habit_id: number;
  task_id: number;
  counts_for_both?: boolean;
}): Promise<HabitBridge | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  // Verify ownership of both
  const okHabit = db
    .prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?')
    .get(input.habit_id, user.id);
  const okTask = db
    .prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?')
    .get(input.task_id, user.id);
  if (!okHabit || !okTask) return null;

  const counts = input.counts_for_both === false ? 0 : 1;
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO habit_task_bridge
         (user_id, habit_id, task_id, counts_for_both)
       VALUES (?, ?, ?, ?)`
    )
    .run(user.id, input.habit_id, input.task_id, counts);
  revalidatePath('/habits');
  if (!result.changes) return null;
  return db
    .prepare('SELECT * FROM habit_task_bridge WHERE id = ?')
    .get(result.lastInsertRowid) as HabitBridge;
}

export async function listHabitBridges(): Promise<HabitBridge[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];
  return db
    .prepare(
      `SELECT b.*, h.name AS habit_name, t.name AS task_name
       FROM habit_task_bridge b
       JOIN habits h ON h.id = b.habit_id
       JOIN tasks t ON t.id = b.task_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(user.id) as HabitBridge[];
}

export async function unbridgeHabitToTask(id: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare(
      'DELETE FROM habit_task_bridge WHERE id = ? AND user_id = ?'
    )
    .run(id, user.id);
  revalidatePath('/habits');
  return result.changes > 0;
}
