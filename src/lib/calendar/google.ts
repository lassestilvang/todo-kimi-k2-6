/**
 * Google Calendar Integration
 * Syncs tasks with Google Calendar
 */

import type { Task } from "@/types";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

export interface CalendarSyncConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

/**
 * Get Google Calendar events for a date range
 */
export async function getCalendarEvents(
  config: CalendarSyncConfig,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    new URLSearchParams({
      timeMin: `${startDate}T00:00:00Z`,
      timeMax: `${endDate}T23:59:59Z`,
      singleEvents: "true",
      orderBy: "startTime",
    }).toString(),
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Create a calendar event from a task
 */
export async function createCalendarEvent(
  config: CalendarSyncConfig,
  task: Task
): Promise<string> {
  if (!task.date) {
    throw new Error("Task has no date");
  }

  const event: CalendarEvent = {
    id: `task-${task.id}`,
    summary: task.name,
    description: task.description || undefined,
    start: {
      dateTime: `${task.date}T09:00:00Z`,
    },
    end: {
      dateTime: `${task.date}T10:00:00Z`,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 15 },
      ],
    },
  };

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
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
 * Update a calendar event
 */
export async function updateCalendarEvent(
  config: CalendarSyncConfig,
  eventId: string,
  task: Task
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: task.name,
        description: task.description || undefined,
        start: {
          dateTime: task.date ? `${task.date}T09:00:00Z` : undefined,
        },
        end: {
          dateTime: task.date ? `${task.date}T10:00:00Z` : undefined,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update event: ${response.statusText}`);
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  config: CalendarSyncConfig,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
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
 * Get OAuth2 authorization URL
 */
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
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

/**
 * Sync all tasks to Google Calendar
 */
export async function syncTasksToCalendar(
  config: CalendarSyncConfig,
  tasks: Task[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  const result = { created: 0, updated: 0, errors: [] as string[] };

  for (const task of tasks) {
    if (!task.date) continue;

    try {
      // Try to create event
      await createCalendarEvent(config, task);
      result.created++;
    } catch (error) {
      // If it's a duplicate, try to update
      if ((error as Error).message.includes("already exists")) {
        try {
          await updateCalendarEvent(config, `task-${task.id}`, task);
          result.updated++;
        } catch (updateError) {
          result.errors.push(`Failed to update task ${task.id}: ${(updateError as Error).message}`);
        }
      } else {
        result.errors.push(`Failed to create task ${task.id}: ${(error as Error).message}`);
      }
    }
  }

  return result;
}

// Re-export Task type for convenience
export type { Task } from "@/types";