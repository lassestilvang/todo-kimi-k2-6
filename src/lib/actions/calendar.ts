"use server";

import { getDb } from "@/lib/db";
import type { CalendarSyncConfig } from "@/types";

export async function getCalendarSync(userId: number): Promise<CalendarSyncConfig | null> {
  const db = getDb();
  const result = db.prepare(
    "SELECT provider, access_token, refresh_token, expires_at, enabled FROM calendar_sync WHERE user_id = ?"
  ).get(userId) as CalendarSyncConfig | undefined;
  return result ?? null;
}

export async function saveCalendarSync(
  userId: number,
  config: Omit<CalendarSyncConfig, "user_id">
): Promise<CalendarSyncConfig> {
  const db = getDb();

  const existing = db.prepare("SELECT id FROM calendar_sync WHERE user_id = ?").get(userId);

  if (existing) {
    db.prepare(
      `UPDATE calendar_sync
       SET provider = ?, access_token = ?, refresh_token = ?, expires_at = ?, enabled = ?
       WHERE user_id = ?`
    ).run(
      config.provider,
      config.access_token,
      config.refresh_token,
      config.expires_at,
      config.enabled,
      userId
    );
  } else {
    db.prepare(
      "INSERT INTO calendar_sync (user_id, provider, access_token, refresh_token, expires_at, enabled) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      userId,
      config.provider,
      config.access_token,
      config.refresh_token,
      config.expires_at,
      config.enabled
    );
  }

  const result = await getCalendarSync(userId);
  if (!result) {
    throw new Error("Failed to save calendar sync config");
  }
  return result;
}

export async function deleteCalendarSync(userId: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM calendar_sync WHERE user_id = ?").run(userId);
}