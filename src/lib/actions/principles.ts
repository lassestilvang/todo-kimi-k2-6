'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { sanitizeString } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export interface OperatingPrinciple {
  id: number;
  user_id: number;
  rule: string;
  category:
    | 'scheduling'
    | 'priority'
    | 'focus'
    | 'energy'
    | 'communication'
    | 'other';
  evidence_count: number;
  confidence: number;
  active: number;
  source: string;
  created_at: string;
  updated_at: string;
}

/**
 * List all operating principles for the current user.
 * Sorted by confidence desc, then recency.
 */
export async function listPrinciples(opts?: {
  onlyActive?: boolean;
  category?: OperatingPrinciple['category'];
}): Promise<OperatingPrinciple[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];

  let sql =
    'SELECT * FROM operating_principles WHERE user_id = ?';
  const params: Array<string | number> = [user.id];

  if (opts?.onlyActive !== false) {
    sql += ' AND active = 1';
  }
  if (opts?.category) {
    sql += ' AND category = ?';
    params.push(opts.category);
  }
  sql += ' ORDER BY confidence DESC, updated_at DESC';

  return db.prepare(sql).all(...params) as OperatingPrinciple[];
}

/**
 * Create a new operating principle.
 */
export async function createPrinciple(input: {
  rule: string;
  category: OperatingPrinciple['category'];
  source?: 'inferred' | 'user' | 'reflection';
  confidence?: number;
}): Promise<OperatingPrinciple | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const rule = sanitizeString(input.rule) ?? '';
  const confidence = Math.max(0, Math.min(1, input.confidence ?? 0.5));
  const source = input.source ?? 'user';

  const result = db
    .prepare(
      `INSERT INTO operating_principles
         (user_id, rule, category, confidence, source, evidence_count, active)
       VALUES (?, ?, ?, ?, ?, 1, 1)`
    )
    .run(user.id, rule, input.category, confidence, source);

  revalidatePath('/principles');
  return db
    .prepare('SELECT * FROM operating_principles WHERE id = ?')
    .get(result.lastInsertRowid) as OperatingPrinciple;
}

/**
 * Toggle the active state of a principle (or update its rule/category).
 */
export async function updatePrinciple(
  id: number,
  patch: Partial<{
    rule: string;
    category: OperatingPrinciple['category'];
    active: boolean;
    confidence: number;
  }>
): Promise<OperatingPrinciple | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const existing = db
    .prepare(
      'SELECT * FROM operating_principles WHERE id = ? AND user_id = ?'
    )
    .get(id, user.id) as OperatingPrinciple | undefined;
  if (!existing) return null;

  const updates: string[] = [];
  const params: Array<string | number | null> = [];

  if (patch.rule !== undefined) {
    updates.push('rule = ?');
    params.push(sanitizeString(patch.rule) ?? '');
  }
  if (patch.category !== undefined) {
    updates.push('category = ?');
    params.push(patch.category);
  }
  if (patch.active !== undefined) {
    updates.push('active = ?');
    params.push(patch.active ? 1 : 0);
  }
  if (patch.confidence !== undefined) {
    updates.push('confidence = ?');
    params.push(Math.max(0, Math.min(1, patch.confidence)));
  }
  updates.push('updated_at = CURRENT_TIMESTAMP');
  updates.push('evidence_count = evidence_count + 1');

  params.push(id, user.id);
  db.prepare(
    `UPDATE operating_principles SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  ).run(...params);

  revalidatePath('/principles');
  return db
    .prepare('SELECT * FROM operating_principles WHERE id = ?')
    .get(id) as OperatingPrinciple;
}

/**
 * Delete a principle (user-controlled only — not for inferred ones we want to keep).
 */
export async function deletePrinciple(id: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare(
      'DELETE FROM operating_principles WHERE id = ? AND user_id = ?'
    )
    .run(id, user.id);
  revalidatePath('/principles');
  return result.changes > 0;
}

/**
 * Suggest a principle based on observed patterns.
 * Heuristic — checks reschedule counts, parked-task frequency, etc.
 */
export async function inferPrinciples(): Promise<OperatingPrinciple[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const inferred: Array<{
    rule: string;
    category: OperatingPrinciple['category'];
    confidence: number;
  }> = [];

  // Pattern 1: tasks rescheduled many times → user procrastinates on X kind of work
  const hotReschedule = db
    .prepare(
      `SELECT cognitive_load, COUNT(*) as cnt FROM tasks
       WHERE user_id = ? AND reschedule_count >= 2 AND cognitive_load IS NOT NULL
       GROUP BY cognitive_load ORDER BY cnt DESC LIMIT 1`
    )
    .get(user.id) as { cognitive_load: string; cnt: number } | undefined;

  if (hotReschedule && hotReschedule.cnt >= 3) {
    inferred.push({
      rule: `You tend to delay ${hotReschedule.cognitive_load} work — schedule it earlier in the day.`,
      category: 'scheduling',
      confidence: Math.min(0.95, 0.4 + hotReschedule.cnt * 0.05),
    });
  }

  // Pattern 2: many parked tasks older than 30 days → not actually wanted
  const oldParked = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM tasks
       WHERE user_id = ? AND parked = 1 AND parked_until IS NOT NULL
         AND date(parked_until) < date('now', '-30 days')`
    )
    .get(user.id) as { cnt: number };
  if (oldParked.cnt >= 3) {
    inferred.push({
      rule: `You park tasks you don't really want to do — consider dropping items parked over 30 days.`,
      category: 'focus',
      confidence: 0.7,
    });
  }

  // Pattern 3: async waits stuck over 14 days
  const stuckWaits = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM async_waits
       WHERE user_id = ? AND status = 'waiting'
         AND julianday('now') - julianday(asked_at) > 14`
    )
    .get(user.id) as { cnt: number };
  if (stuckWaits.cnt >= 2) {
    inferred.push({
      rule: `You wait on people longer than you realize — set 7-day nudge thresholds by default.`,
      category: 'communication',
      confidence: 0.65,
    });
  }

  // Insert new inferences, skipping duplicates by rule text
  const created: OperatingPrinciple[] = [];
  for (const i of inferred) {
    const existing = db
      .prepare(
        `SELECT * FROM operating_principles
         WHERE user_id = ? AND rule = ? AND source = 'inferred'`
      )
      .get(user.id, i.rule);
    if (existing) continue;

    const result = db
      .prepare(
        `INSERT INTO operating_principles
           (user_id, rule, category, confidence, source, evidence_count, active)
         VALUES (?, ?, ?, ?, 'inferred', 1, 1)`
      )
      .run(user.id, i.rule, i.category, i.confidence);
    created.push(
      db
        .prepare('SELECT * FROM operating_principles WHERE id = ?')
        .get(result.lastInsertRowid) as OperatingPrinciple
    );
  }

  if (created.length) revalidatePath('/principles');
  return created;
}
