/**
 * Calendar Sync Module
 * Provides unified interface for calendar integrations
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
  provider: "google" | "outlook";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

// Re-export types
export type { Task } from "@/types";

// Import Google calendar functions
import {
  getCalendarEvents as googleGetEvents,
  createCalendarEvent as googleCreateEvent,
  updateCalendarEvent as googleUpdateEvent,
  deleteCalendarEvent as googleDeleteEvent,
  getAuthUrl as googleGetAuthUrl,
  exchangeCodeForTokens as googleExchangeCode,
  syncTasksToCalendar as googleSyncTasks,
  type CalendarSyncConfig as GoogleSyncConfig,
} from "./google";

// Import Outlook calendar functions
import {
  getOutlookEvents as outlookGetEvents,
  createOutlookEvent as outlookCreateEvent,
  updateOutlookEvent as outlookUpdateEvent,
  deleteOutlookEvent as outlookDeleteEvent,
  getOutlookAuthUrl,
  exchangeOutlookCodeForTokens,
  type OutlookSyncConfig,
} from "./outlook";

/**
 * Get calendar events for a date range
 */
export async function getCalendarEvents(
  config: CalendarSyncConfig,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  if (config.provider === "google") {
    return googleGetEvents(config as GoogleSyncConfig, startDate, endDate);
  }
  if (config.provider === "outlook") {
    const events = await outlookGetEvents(config as OutlookSyncConfig, startDate, endDate);
    // Convert Outlook events to match CalendarEvent interface
    return events.map(e => ({
      id: e.id,
      summary: e.subject,
      description: e.body?.content,
      start: { dateTime: e.start.dateTime },
      end: { dateTime: e.end.dateTime },
      reminders: e.isReminderOn ? { useDefault: true, overrides: [] } : undefined,
    }));
  }
  throw new Error(`Calendar provider ${config.provider} not yet implemented`);
}

/**
 * Create a calendar event from a task
 */
export async function createCalendarEvent(
  config: CalendarSyncConfig,
  task: Task
): Promise<string> {
  if (config.provider === "google") {
    return googleCreateEvent(config as GoogleSyncConfig, task);
  }
  if (config.provider === "outlook") {
    return outlookCreateEvent(config as OutlookSyncConfig, task);
  }
  throw new Error(`Calendar provider ${config.provider} not yet implemented`);
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  config: CalendarSyncConfig,
  eventId: string,
  task: Task
): Promise<void> {
  if (config.provider === "google") {
    return googleUpdateEvent(config as GoogleSyncConfig, eventId, task);
  }
  if (config.provider === "outlook") {
    return outlookUpdateEvent(config as OutlookSyncConfig, eventId, task);
  }
  throw new Error(`Calendar provider ${config.provider} not yet implemented`);
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  config: CalendarSyncConfig,
  eventId: string
): Promise<void> {
  if (config.provider === "google") {
    return googleDeleteEvent(config as GoogleSyncConfig, eventId);
  }
  if (config.provider === "outlook") {
    return outlookDeleteEvent(config as OutlookSyncConfig, eventId);
  }
  throw new Error(`Calendar provider ${config.provider} not yet implemented`);
}

/**
 * Get OAuth2 authorization URL
 */
export function getAuthUrl(provider: "google" | "outlook", state: string): string {
  if (provider === "google") {
    return googleGetAuthUrl(state);
  }
  if (provider === "outlook") {
    return getOutlookAuthUrl(state);
  }
  throw new Error(`Calendar provider ${provider} not yet implemented`);
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  provider: "google" | "outlook",
  code: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  if (provider === "google") {
    return googleExchangeCode(code);
  }
  if (provider === "outlook") {
    return exchangeOutlookCodeForTokens(code);
  }
  throw new Error(`Calendar provider ${provider} not yet implemented`);
}

/**
 * Sync all tasks to calendar
 */
export async function syncTasksToCalendar(
  config: CalendarSyncConfig,
  tasks: Task[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  if (config.provider === "google") {
    return googleSyncTasks(config as GoogleSyncConfig, tasks);
  }
  if (config.provider === "outlook") {
    // Outlook sync implementation
    let created = 0;
    const errors: string[] = [];
    for (const task of tasks) {
      if (!task.date) continue;
      try {
        await outlookCreateEvent(config as OutlookSyncConfig, task);
        created++;
      } catch (error) {
        errors.push(`Failed to sync task ${task.id}: ${(error as Error).message}`);
      }
    }
    return { created, updated: 0, errors };
  }
  throw new Error(`Calendar provider ${config.provider} not yet implemented`);
}