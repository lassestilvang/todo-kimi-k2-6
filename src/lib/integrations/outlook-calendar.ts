/**
 * Outlook Calendar Integration
 * Enables sync between tasks with due dates and Microsoft Outlook Calendar
 * Supports both personal Microsoft accounts and Exchange/Office 365 Enterprise
 *
 * Requires: Microsoft Graph API credentials
 * Scopes: Calendars.ReadWrite, offline_access
 */

import { getDb } from "@/lib/db";
import type { Task } from "@/types";

export interface OutlookCalendarSync {
  id: number;
  user_id: number;
  provider: "outlook";
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  enabled: boolean;
  tenant_id?: string | null;
}

/**
 * Get Outlook Calendar sync settings for a user
 */
export function getOutlookCalendarSync(userId: number): OutlookCalendarSync | null {
  const db = getDb();
  return db
    .prepare("SELECT * FROM calendar_sync WHERE user_id = ? AND provider = 'outlook'")
    .get(userId) as OutlookCalendarSync | undefined ?? null;
}

/**
 * Enable Outlook Calendar sync for a user
 */
export function enableOutlookCalendarSync(
  userId: number,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  tenantId?: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO calendar_sync (user_id, provider, access_token, refresh_token, expires_at, enabled, tenant_id)
     VALUES (?, 'outlook', ?, ?, ?, 1, ?)`
  ).run(userId, accessToken, refreshToken, expiresAt, tenantId || null);
}

/**
 * Disable Outlook Calendar sync for a user
 */
export function disableOutlookCalendarSync(userId: number): void {
  const db = getDb();
  db.prepare("UPDATE calendar_sync SET enabled = 0 WHERE user_id = ? AND provider = 'outlook'")
    .run(userId);
}

/**
 * Sync a task with due date to Outlook Calendar
 */
export async function syncTaskToCalendar(
  task: Task,
  sync: OutlookCalendarSync
): Promise<string | null> {
  if (!task.deadline) return null;

  const accessToken = await refreshAccessTokenIfNeeded(sync);
  if (!accessToken) return null;

  const event = {
    subject: task.name,
    body: {
      contentType: "HTML",
      content: `<html><body>${task.description || ""}</body></html>`,
    },
    start: {
      dateTime: task.deadline,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
    end: {
      dateTime: new Date(new Date(task.deadline).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
    isReminderOn: true,
    reminderDateTime: {
      dateTime: new Date(new Date(task.deadline).getTime() - 15 * 60 * 1000).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
    categories: task.priority ? [task.priority.toUpperCase()] : undefined,
  };

  const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to create Outlook event: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Remove a task from Outlook Calendar
 */
export async function removeFromCalendar(
  eventId: string,
  sync: OutlookCalendarSync
): Promise<void> {
  const accessToken = await refreshAccessTokenIfNeeded(sync);
  if (!accessToken) return;

  await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Get Outlook OAuth2 authorization URL
 */
export function getOutlookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID || "",
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/outlook`,
    response_type: "code",
    scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access openid profile",
    state,
    prompt: "consent", // Force consent to get refresh token
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeOutlookCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID || "",
      client_secret: process.env.OUTLOOK_CLIENT_SECRET || "",
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/outlook`,
      grant_type: "authorization_code",
      code,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${error.error_description || response.statusText}`);
  }

  return response.json();
}

/**
 * Get user profile from Outlook
 */
export async function getOutlookUserProfile(accessToken: string): Promise<{
  id: string;
  displayName: string;
  email: string;
}> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Outlook profile: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    displayName: data.displayName,
    email: data.mail || data.userPrincipalName,
  };
}

/**
 * Refresh access token if expired
 */
async function refreshAccessTokenIfNeeded(sync: OutlookCalendarSync): Promise<string | null> {
  if (!sync.expires_at || Date.now() < sync.expires_at) {
    return sync.access_token;
  }

  if (!sync.refresh_token) return null;

  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
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