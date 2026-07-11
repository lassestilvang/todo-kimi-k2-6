/**
 * Google Calendar Integration
 * Enables sync between tasks with due dates and Google Calendar events
 */

import { getDb } from "@/lib/db";
import type { Task } from "@/types";

export interface GoogleCalendarSync {
  id: number;
  user_id: number;
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  enabled: boolean;
}

/**
 * Get Google Calendar sync settings for a user
 */
export function getGoogleCalendarSync(userId: number): GoogleCalendarSync | null {
  const db = getDb();
  return db
    .prepare("SELECT * FROM calendar_sync WHERE user_id = ? AND provider = 'google'")
    .get(userId) as GoogleCalendarSync | undefined ?? null;
}

/**
 * Enable Google Calendar sync for a user
 */
export function enableGoogleCalendarSync(
  userId: number,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO calendar_sync (user_id, provider, access_token, refresh_token, expires_at, enabled)
     VALUES (?, 'google', ?, ?, ?, 1)`
  ).run(userId, accessToken, refreshToken, expiresAt);
}

/**
 * Disable Google Calendar sync for a user
 */
export function disableGoogleCalendarSync(userId: number): void {
  const db = getDb();
  db.prepare("UPDATE calendar_sync SET enabled = 0 WHERE user_id = ? AND provider = 'google'")
    .run(userId);
}

/**
 * Sync a task with due date to Google Calendar
 */
export async function syncTaskToCalendar(
  task: Task,
  sync: GoogleCalendarSync
): Promise<string | null> {
  if (!task.deadline) return null;

  const accessToken = await refreshAccessTokenIfNeeded(sync);
  if (!accessToken) return null;

  const event = {
    summary: task.name,
    description: task.description || "",
    start: {
      dateTime: task.deadline,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: new Date(new Date(task.deadline).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(`Failed to create calendar event: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Remove a task from Google Calendar
 */
export async function removeFromCalendar(
  eventId: string,
  sync: GoogleCalendarSync
): Promise<void> {
  const accessToken = await refreshAccessTokenIfNeeded(sync);
  if (!accessToken) return;

  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Refresh access token if expired
 */
async function refreshAccessTokenIfNeeded(sync: GoogleCalendarSync): Promise<string | null> {
  if (!sync.expires_at || Date.now() < sync.expires_at) {
    return sync.access_token;
  }

  if (!sync.refresh_token) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: sync.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const newExpiresAt = Date.now() + data.expires_in * 1000;

  // Update stored token
  const db = getDb();
  db.prepare(
    "UPDATE calendar_sync SET access_token = ?, expires_at = ? WHERE id = ?"
  ).run(data.access_token, newExpiresAt, sync.id);

  return data.access_token;
}