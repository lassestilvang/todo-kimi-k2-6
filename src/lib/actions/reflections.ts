'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { sanitizeString } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { currentWeek as weekOf } from '@/lib/week-utils';

export interface Reflection {
  id: number;
  user_id: number;
  week_of: string;
  surprised: string | null;
  worked: string | null;
  did_not_work: string | null;
  should_change: string | null;
  gratitude: string | null;
  extracted_principle_ids: string | null;
  mood_score: number | null;
  created_at: string;
}

/**
 * Save a reflection for a given week (upsert).
 */
export async function saveReflection(input: {
  surprised?: string | null;
  worked?: string | null;
  did_not_work?: string | null;
  should_change?: string | null;
  gratitude?: string | null;
  mood_score?: number | null;
  week?: string;
}): Promise<Reflection | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const w = input.week ?? weekOf();
  const sanitize = (v: string | null | undefined) =>
    sanitizeString(v ?? '') ?? null;

  const existing = db
    .prepare('SELECT id FROM reflections WHERE user_id = ? AND week_of = ?')
    .get(user.id, w) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE reflections
       SET surprised = ?, worked = ?, did_not_work = ?, should_change = ?,
           gratitude = ?, mood_score = ?
       WHERE id = ? AND user_id = ?`
    ).run(
      sanitize(input.surprised),
      sanitize(input.worked),
      sanitize(input.did_not_work),
      sanitize(input.should_change),
      sanitize(input.gratitude),
      input.mood_score ?? null,
      existing.id,
      user.id
    );
    revalidatePath('/reflections');
    return db
      .prepare('SELECT * FROM reflections WHERE id = ?')
      .get(existing.id) as Reflection;
  }

  const result = db
    .prepare(
      `INSERT INTO reflections
         (user_id, week_of, surprised, worked, did_not_work, should_change, gratitude, mood_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      w,
      sanitize(input.surprised),
      sanitize(input.worked),
      sanitize(input.did_not_work),
      sanitize(input.should_change),
      sanitize(input.gratitude),
      input.mood_score ?? null
    );

  revalidatePath('/reflections');
  return db
    .prepare('SELECT * FROM reflections WHERE id = ?')
    .get(result.lastInsertRowid) as Reflection;
}

/**
 * Get a reflection for a specific week (defaults to current).
 */
export async function getReflection(week?: string): Promise<Reflection | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const w = week ?? weekOf();
  const row = db
    .prepare('SELECT * FROM reflections WHERE user_id = ? AND week_of = ?')
    .get(user.id, w) as Reflection | undefined;
  return row ?? null;
}

/**
 * List all reflections (most recent first).
 */
export async function listReflections(limit = 12): Promise<Reflection[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];

  return db
    .prepare(
      `SELECT * FROM reflections WHERE user_id = ?
       ORDER BY week_of DESC LIMIT ?`
    )
    .all(user.id, limit) as Reflection[];
}

// NOTE: `currentWeek` lives in `@/lib/week-utils` because 'use server' files
// in Next.js 16 cannot export synchronous helpers.
