'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { sanitizeString } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export interface ReadingItem {
  id: number;
  user_id: number;
  url: string | null;
  title: string;
  source: string | null;
  item_type: 'article' | 'video' | 'podcast' | 'paper' | 'book' | 'thread';
  summary: string | null;
  action_items: string | null;
  status: 'queued' | 'in_progress' | 'done' | 'archived';
  saved_at: string;
  consumed_at: string | null;
  created_task_ids: string | null;
}

export async function addToReadingQueue(input: {
  url?: string | null;
  title: string;
  source?: string | null;
  item_type?: ReadingItem['item_type'];
}): Promise<ReadingItem | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const result = db
    .prepare(
      `INSERT INTO reading_queue (user_id, url, title, source, item_type)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      input.url ?? null,
      sanitizeString(input.title) ?? '',
      sanitizeString(input.source ?? '') ?? null,
      input.item_type ?? 'article'
    );
  revalidatePath('/reading');
  return db
    .prepare('SELECT * FROM reading_queue WHERE id = ?')
    .get(result.lastInsertRowid) as ReadingItem;
}

export async function listReadingQueue(opts?: {
  status?: ReadingItem['status'];
}): Promise<ReadingItem[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];
  let sql = 'SELECT * FROM reading_queue WHERE user_id = ?';
  const params: Array<string | number> = [user.id];
  if (opts?.status) {
    sql += ' AND status = ?';
    params.push(opts.status);
  }
  sql += ' ORDER BY saved_at DESC';
  return db.prepare(sql).all(...params) as ReadingItem[];
}

export async function setReadingStatus(
  id: number,
  status: ReadingItem['status']
): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const consumed = status === 'done' ? ', consumed_at = CURRENT_TIMESTAMP' : '';
  const result = db
    .prepare(
      `UPDATE reading_queue SET status = ?${consumed} WHERE id = ? AND user_id = ?`
    )
    .run(status, id, user.id);
  revalidatePath('/reading');
  return result.changes > 0;
}

export async function setReadingSummary(
  id: number,
  summary: string,
  actionItems?: string | null
): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare(
      'UPDATE reading_queue SET summary = ?, action_items = ? WHERE id = ? AND user_id = ?'
    )
    .run(
      sanitizeString(summary) ?? '',
      sanitizeString(actionItems ?? '') ?? null,
      id,
      user.id
    );
  revalidatePath('/reading');
  return result.changes > 0;
}

export async function deleteReadingItem(id: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare('DELETE FROM reading_queue WHERE id = ? AND user_id = ?')
    .run(id, user.id);
  revalidatePath('/reading');
  return result.changes > 0;
}
