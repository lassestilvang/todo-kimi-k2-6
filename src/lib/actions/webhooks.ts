'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { sanitizeString } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { createHash, randomBytes } from 'node:crypto';

export interface Webhook {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  workflow_id: number | null;
  secret: string | null;
  active: number;
  last_called_at: string | null;
  call_count: number;
  created_at: string;
}

/**
 * Generate a per-user-unique slug. Caller must verify uniqueness with a quick
 * count query; we use a random suffix if collision.
 */
async function uniqueSlug(
  base: string,
  userId: number,
  db: ReturnType<typeof getDb>
): Promise<string> {
  const sanitized = base
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'hook';
  const existing = db
    .prepare(
      'SELECT COUNT(*) AS c FROM webhooks WHERE user_id = ? AND slug = ?'
    )
    .get(userId, sanitized) as { c: number };
  if (existing.c === 0) return sanitized;
  return `${sanitized}-${randomBytes(3).toString('hex')}`;
}

export async function listWebhooks(): Promise<Webhook[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];
  return db
    .prepare(
      'SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC'
    )
    .all(user.id) as Webhook[];
}

export async function createWebhook(input: {
  name: string;
  slug: string;
  workflow_id?: number | null;
  generateSecret?: boolean;
}): Promise<Webhook | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const finalSlug = await uniqueSlug(input.slug, user.id, db);
  const secret =
    input.generateSecret === false
      ? null
      : createHash('sha256')
          .update(`${user.id}:${input.slug}:${randomBytes(16).toString('hex')}`)
          .digest('hex');

  const result = db
    .prepare(
      `INSERT INTO webhooks (user_id, name, slug, workflow_id, secret)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      sanitizeString(input.name) ?? '',
      finalSlug,
      input.workflow_id ?? null,
      secret
    );
  revalidatePath('/webhooks');
  return db
    .prepare('SELECT * FROM webhooks WHERE id = ?')
    .get(result.lastInsertRowid) as Webhook;
}

export async function toggleWebhook(id: number, active: boolean): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare('UPDATE webhooks SET active = ? WHERE id = ? AND user_id = ?')
    .run(active ? 1 : 0, id, user.id);
  revalidatePath('/webhooks');
  return result.changes > 0;
}

export async function deleteWebhook(id: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare('DELETE FROM webhooks WHERE id = ? AND user_id = ?')
    .run(id, user.id);
  revalidatePath('/webhooks');
  return result.changes > 0;
}

/**
 * Public ingestion endpoint (no auth — uses slug for routing).
 * Returns the webhook row or null if not found / inactive.
 */
export async function findActiveWebhookBySlug(slug: string): Promise<Webhook | null> {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM webhooks WHERE slug = ? AND active = 1')
    .get(slug) as Webhook | undefined;
  return row ?? null;
}

export async function recordWebhookCall(id: number): Promise<void> {
  const db = getDb();
  db.prepare(
    `UPDATE webhooks
     SET last_called_at = CURRENT_TIMESTAMP, call_count = call_count + 1
     WHERE id = ?`
  ).run(id);
}
