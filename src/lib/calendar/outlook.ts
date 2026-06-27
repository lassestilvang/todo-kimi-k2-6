/**
 * Microsoft Outlook Calendar Integration
 * Syncs tasks with Outlook Calendar via Microsoft Graph API
 */

import type { Task } from "@/types";

export interface OutlookEvent {
  id: string;
  subject: string;
  body: {
    contentType: "html" | "text";
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isReminderOn: boolean;
  reminderMinutesBeforeStart: number;
}

export interface OutlookSyncConfig {
  accessToken: string;
}

/**
 * Get Outlook calendar events for a date range
 */
export async function getOutlookEvents(
  config: OutlookSyncConfig,
  startDate: string,
  endDate: string
): Promise<OutlookEvent[]> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events?` +
    new URLSearchParams({
      $filter: `start/dateTime ge '${startDate}' and start/dateTime le '${endDate}'`,
      $select: "id,subject,body,start,end,isReminderOn,reminderMinutesBeforeStart",
    }).toString(),
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Outlook Calendar API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.value || [];
}

/**
 * Create an Outlook calendar event from a task
 */
export async function createOutlookEvent(
  config: OutlookSyncConfig,
  task: Task
): Promise<string> {
  if (!task.date) {
    throw new Error("Task has no date");
  }

  const event = {
    subject: task.name,
    body: {
      contentType: "text",
      content: task.description || "",
    },
    start: {
      dateTime: `${task.date}T09:00:00`,
      timeZone: "UTC",
    },
    end: {
      dateTime: `${task.date}T10:00:00`,
      timeZone: "UTC",
    },
    isReminderOn: true,
    reminderMinutesBeforeStart: 15,
  };

  const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create event: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();
  return result.id;
}

/**
 * Update an Outlook calendar event
 */
export async function updateOutlookEvent(
  config: OutlookSyncConfig,
  eventId: string,
  task: Task
): Promise<void> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: task.name,
        body: {
          contentType: "text",
          content: task.description || "",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update event: ${response.statusText}`);
  }
}

/**
 * Delete an Outlook calendar event
 */
export async function deleteOutlookEvent(
  config: OutlookSyncConfig,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete event: ${response.statusText}`);
  }
}

/**
 * Get OAuth2 authorization URL for Outlook
 */
export function getOutlookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/microsoft`,
    response_type: "code",
    scope: "Calendars.ReadWrite",
    response_mode: "query",
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeOutlookCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/microsoft`,
      grant_type: "authorization_code",
      code,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || response.statusText}`);
  }

  return response.json();
}