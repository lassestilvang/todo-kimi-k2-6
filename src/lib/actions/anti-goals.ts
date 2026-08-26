'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { sanitizeString } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export interface AntiGoal {
  id: number;
  user_id: number;
  title: string;
  reason: string | null;
  active: number;
  valid_until: string | null;
  created_at: string;
}

export async function listAntiGoals(opts?: { onlyActive?: boolean }): Promise<AntiGoal[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];
  let sql = 'SELECT * FROM anti_goals WHERE user_id = ?';
  const params: Array<string | number> = [user.id];
  if (opts?.onlyActive !== false) {
    sql +=
      " AND active = 1 AND (valid_until IS NULL OR date(valid_until) >= date('now'))";
  }
  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all(...params) as AntiGoal[];
}

export async function createAntiGoal(input: {
  title: string;
  reason?: string | null;
  valid_until?: string | null;
}): Promise<AntiGoal | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const result = db
    .prepare(
      `INSERT INTO anti_goals (user_id, title, reason, valid_until)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      user.id,
      sanitizeString(input.title) ?? '',
      sanitizeString(input.reason ?? '') ?? null,
      input.valid_until ?? null
    );
  revalidatePath('/anti-goals');
  return db
    .prepare('SELECT * FROM anti_goals WHERE id = ?')
    .get(result.lastInsertRowid) as AntiGoal;
}

export async function toggleAntiGoal(id: number, active: boolean): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare(
      'UPDATE anti_goals SET active = ? WHERE id = ? AND user_id = ?'
    )
    .run(active ? 1 : 0, id, user.id);
  revalidatePath('/anti-goals');
  return result.changes > 0;
}

export async function deleteAntiGoal(id: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare('DELETE FROM anti_goals WHERE id = ? AND user_id = ?')
    .run(id, user.id);
  revalidatePath('/anti-goals');
  return result.changes > 0;
}
