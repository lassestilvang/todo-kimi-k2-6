/**
 * Outlook Calendar Integration
 * Syncs tasks with Microsoft Outlook/Exchange Calendar
 */

import type { Task } from '@/types';

export interface OutlookEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'HTML' | 'Text';
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
  location?: string;
  isReminderOn?: boolean;
  reminderDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  categories?: string[];
}

export interface OutlookCalendarSyncConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tenantId?: string;
}

const OUTLOOK_API_BASE = 'https://graph.microsoft.com/v1.0';
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/**
 * Get Outlook Calendar events for a date range
 */
export async function getOutlookEvents(
  config: OutlookCalendarSyncConfig,
  startDate: string,
  endDate: string
): Promise<OutlookEvent[]> {
  const response = await fetch(
    `${OUTLOOK_API_BASE}/me/calendar/events?` +
      new URLSearchParams({
        startDateTime: `${startDate}T00:00:00`,
        endDateTime: `${endDate}T23:59:59Z`,
        $filter: 'isCancelled eq false',
        $orderby: 'start/dateTime',
      }).toString(),
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Outlook Calendar API error: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.value || [];
}

/**
 * Create an Outlook calendar event from a task
 */
export async function createOutlookEvent(
  config: OutlookCalendarSyncConfig,
  task: Task
): Promise<string> {
  if (!task.date) {
    throw new Error('Task has no date');
  }

  const event: OutlookEvent = {
    subject: task.name,
    body: {
      contentType: 'HTML',
      content: task.description || task.notes || '',
    },
    start: {
      dateTime: `${task.date}T09:00:00`,
      timeZone: TIME_ZONE,
    },
    end: {
      dateTime: `${task.date}T10:00:00`,
      timeZone: TIME_ZONE,
    },
    isReminderOn: true,
    reminderDateTime: {
      dateTime: `${task.date}T08:45:00`,
      timeZone: TIME_ZONE,
    },
    categories: task.priority ? [task.priority.toUpperCase()] : undefined,
    location: task.labels?.map(l => l.name).join(', ') || undefined,
  };

  const response = await fetch(`${OUTLOOK_API_BASE}/me/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to create Outlook event: ${error.error?.message || response.statusText}`
    );
  }

  const result = await response.json();
  return result.id;
}

/**
 * Update an Outlook calendar event
 */
export async function updateOutlookEvent(
  config: OutlookCalendarSyncConfig,
  eventId: string,
  task: Task
): Promise<void> {
  const event: Partial<OutlookEvent> = {
    subject: task.name,
    body: {
      contentType: 'HTML',
      content: task.description || task.notes || '',
    },
    start: task.date
      ? {
          dateTime: `${task.date}T09:00:00`,
          timeZone: TIME_ZONE,
        }
      : undefined,
    end: task.date
      ? {
          dateTime: `${task.date}T10:00:00`,
          timeZone: TIME_ZONE,
        }
      : undefined,
  };

  const response = await fetch(`${OUTLOOK_API_BASE}/me/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to update Outlook event: ${error.error?.message || response.statusText}`
    );
  }
}

/**
 * Delete an Outlook calendar event
 */
export async function deleteOutlookEvent(
  config: OutlookCalendarSyncConfig,
  eventId: string
): Promise<void> {
  const response = await fetch(`${OUTLOOK_API_BASE}/me/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to delete Outlook event: ${error.error?.message || response.statusText}`
    );
  }
}

/**
 * Get Outlook OAuth2 authorization URL
 */
export function getOutlookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID || '',
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/outlook`,
    response_type: 'code',
    scope:
      'https://graph.microsoft.com/Calendars.ReadWrite offline_access openid',
    state,
    prompt: 'consent', // Force consent to get refresh token
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
  const response = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID || '',
        client_secret: process.env.OUTLOOK_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/outlook`,
        grant_type: 'authorization_code',
        code,
      }).toString(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Outlook token exchange failed: ${error.error_description || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Refresh Outlook access token
 */
export async function refreshOutlookToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const response = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID || '',
        client_secret: process.env.OUTLOOK_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/outlook`,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Outlook token refresh failed: ${error.error_description || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Sync all tasks to Outlook Calendar
 */
export async function syncTasksToOutlook(
  config: OutlookCalendarSyncConfig,
  tasks: Task[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  const result = { created: 0, updated: 0, errors: [] as string[] };
  const existingEvents = await getOutlookEvents(
    config,
    new Date().toISOString().split('T')[0],
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Create a map of existing events by subject (simplified - in production, use event IDs)
  const existingEventIds = new Map<string, string>();
  for (const event of existingEvents) {
    existingEventIds.set(event.subject, event.id || '');
  }

  for (const task of tasks) {
    if (!task.date) continue;

    const eventId = existingEventIds.get(task.name);

    try {
      if (eventId) {
        await updateOutlookEvent(config, eventId, task);
        result.updated++;
      } else {
        await createOutlookEvent(config, task);
        result.created++;
      }
    } catch (error) {
      result.errors.push(
        `Failed to sync task ${task.id}: ${(error as Error).message}`
      );
    }
  }

  return result;
}

/**
 * Detect events that should be marked as completed
 */
export async function getCompletedTaskEvents(
  config: OutlookCalendarSyncConfig,
  tasks: Task[]
): Promise<{ taskId: number; eventId: string }[]> {
  const completedTaskIds = tasks.filter(t => t.completed).map(t => t.id);

  if (completedTaskIds.length === 0) {
    return [];
  }

  const events = await getOutlookEvents(
    config,
    new Date().toISOString().split('T')[0],
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const results: { taskId: number; eventId: string }[] = [];

  for (const task of tasks) {
    if (task.completed) continue;

    const event = events.find(e => e.subject === task.name);
    if (event && event.id) {
      results.push({ taskId: task.id, eventId: event.id });
    }
  }

  return results;
}
