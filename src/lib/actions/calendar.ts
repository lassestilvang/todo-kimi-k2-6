'use server';

import { getDb } from '@/lib/db';
import type { CalendarSync } from '@/types';

/**
 * Get calendar sync configuration for a user
 */
export async function getCalendarSync(
  userId: number
): Promise<CalendarSync | null> {
  const db = getDb();
  const result = db
    .prepare(
      'SELECT provider, access_token, refresh_token, expires_at, enabled, tenant_id, created_at FROM calendar_sync WHERE user_id = ?'
    )
    .get(userId) as CalendarSync | undefined;
  return result ?? null;
}

/**
 * Get calendar sync by provider for a user
 */
export async function getCalendarSyncByProvider(
  userId: number,
  provider: 'google' | 'outlook'
): Promise<CalendarSync | null> {
  const db = getDb();
  const result = db
    .prepare(
      'SELECT provider, access_token, refresh_token, expires_at, enabled, tenant_id, created_at FROM calendar_sync WHERE user_id = ? AND provider = ?'
    )
    .get(userId, provider) as CalendarSync | undefined;
  return result ?? null;
}

/**
 * Save calendar sync configuration
 */
export async function saveCalendarSync(
  userId: number,
  config: Omit<CalendarSync, 'user_id' | 'id' | 'created_at'>
): Promise<CalendarSync> {
  const db = getDb();

  const existing = db
    .prepare('SELECT id FROM calendar_sync WHERE user_id = ?')
    .get(userId);

  if (existing) {
    db.prepare(
      `UPDATE calendar_sync
       SET provider = ?, access_token = ?, refresh_token = ?, expires_at = ?, enabled = ?, tenant_id = ?
       WHERE user_id = ?`
    ).run(
      config.provider,
      config.access_token,
      config.refresh_token,
      config.expires_at,
      config.enabled,
      config.tenant_id ?? null,
      userId
    );
  } else {
    db.prepare(
      'INSERT INTO calendar_sync (user_id, provider, access_token, refresh_token, expires_at, enabled, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      userId,
      config.provider,
      config.access_token,
      config.refresh_token,
      config.expires_at,
      config.enabled,
      config.tenant_id ?? null
    );
  }

  const result = await getCalendarSync(userId);
  if (!result) {
    throw new Error('Failed to save calendar sync config');
  }
  return result;
}

/**
 * Delete all calendar sync configurations for a user
 */
export async function deleteCalendarSync(userId: number): Promise<void> {
  const db = getDb();
  db.prepare('DELETE FROM calendar_sync WHERE user_id = ?').run(userId);
}

/**
 * Delete calendar sync for a specific provider
 */
export async function deleteCalendarSyncByProvider(
  userId: number,
  provider: 'google' | 'outlook'
): Promise<boolean> {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM calendar_sync WHERE user_id = ? AND provider = ?')
    .run(userId, provider);
  return result.changes > 0;
}

/**
 * Enable calendar sync for a user
 */
export async function enableCalendarSync(
  userId: number,
  provider: 'google' | 'outlook',
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  tenantId?: string
): Promise<CalendarSync> {
  const db = getDb();

  const existing = db
    .prepare('SELECT id FROM calendar_sync WHERE user_id = ? AND provider = ?')
    .get(userId, provider);

  if (existing) {
    db.prepare(
      `UPDATE calendar_sync
       SET access_token = ?, refresh_token = ?, expires_at = ?, enabled = 1, tenant_id = ?
       WHERE user_id = ? AND provider = ?`
    ).run(
      accessToken,
      refreshToken,
      expiresAt,
      tenantId ?? null,
      userId,
      provider
    );
  } else {
    db.prepare(
      'INSERT INTO calendar_sync (user_id, provider, access_token, refresh_token, expires_at, enabled, tenant_id) VALUES (?, ?, ?, ?, ?, 1, ?)'
    ).run(
      userId,
      provider,
      accessToken,
      refreshToken,
      expiresAt,
      tenantId ?? null
    );
  }

  const result = await getCalendarSync(userId);
  if (!result) {
    throw new Error('Failed to enable calendar sync');
  }
  return result;
}

/**
 * Disable calendar sync for a user
 */
export async function disableCalendarSync(
  userId: number,
  provider: 'google' | 'outlook'
): Promise<boolean> {
  const db = getDb();
  const result = db
    .prepare(
      'UPDATE calendar_sync SET enabled = 0 WHERE user_id = ? AND provider = ?'
    )
    .run(userId, provider);
  return result.changes > 0;
}
