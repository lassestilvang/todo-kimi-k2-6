/**
 * Outlook Calendar Integration Connector
 * Syncs tasks with Microsoft Outlook/Exchange Calendar
 *
 * Requires: Microsoft Graph API credentials
 * Scopes: Calendars.ReadWrite, offline_access
 */

import {
  BaseConnector,
  IntegrationConfig,
  ExternalRecord,
} from './base-connector';
import type { Task } from '@/types';

export interface OutlookCalendarRecord extends ExternalRecord {
  eventId: string;
  attendees?: Array<{
    name: string;
    emailAddress: string;
  }>;
  body: string;
  sensitivity: 'normal' | 'personal' | 'private';
  categories?: string[];
  labels?: string[];
}

export class OutlookConnector extends BaseConnector {
  readonly id = 'outlook';
  readonly type = 'outlook';
  readonly name = 'Outlook Calendar';

  private apiToken: string;
  private refreshTokenValue: string | null = null;

  constructor(
    config: IntegrationConfig & { apiToken: string; refreshToken?: string }
  ) {
    super(config);
    this.apiToken = config.apiToken;
    this.refreshTokenValue = config.refreshToken || null;
  }

  async authenticate(
    credentials: {
      clientId?: string;
      clientSecret?: string;
      accessToken?: string;
      refreshToken?: string;
    } = {}
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: string;
  }> {
    if (!credentials.accessToken) {
      throw new Error('Outlook integration requires an access token');
    }

    this.apiToken = credentials.accessToken;
    this.refreshTokenValue = credentials.refreshToken || null;

    return {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };
  }

  async fetchRecords(
    since?: Date,
    options?: { limit?: number; cursor?: string }
  ): Promise<OutlookCalendarRecord[]> {
    const records: OutlookCalendarRecord[] = [];
    const timeMin = since
      ? since.toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const response = await this.graphApiFetch(
      `https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge ${encodeURIComponent(timeMin)} and isCancelled eq false&$orderby=start/dateTime&$top=${options?.limit || 50}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Outlook API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const events = data.value || [];

    for (const event of events) {
      const record = this.mapOutlookEventToTask(event);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  mapToTask(
    record: ExternalRecord,
    _fieldMappings?: Record<string, string>
  ): {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  } {
    const outlookRecord = record as OutlookCalendarRecord;
    return {
      title: outlookRecord.title || 'Untitled',
      description: outlookRecord.description || outlookRecord.body || '',
      dueDate: this.extractDueDateFromEvent(outlookRecord),
      labels: outlookRecord.labels || [],
      assignee: outlookRecord.assignee,
      priority: this.extractPriorityFromEvent(outlookRecord),
    };
  }

  async pushTask(task: {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<ExternalRecord & { eventId: string }> {
    if (!task.dueDate) {
      throw new Error('Task must have a due date for Outlook Calendar');
    }

    const event = {
      subject: task.title,
      body: task.description
        ? {
            contentType: 'HTML',
            content: `<html><body>${task.description}</body></html>`,
          }
        : undefined,
      start: {
        dateTime: `${task.dueDate}T09:00:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      end: {
        dateTime: `${task.dueDate}T10:00:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      isReminderOn: true,
      reminderDateTime: {
        dateTime: `${task.dueDate}T08:45:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      categories: task.priority ? [task.priority.toUpperCase()] : undefined,
    };

    const response = await this.graphApiFetch(
      'https://graph.microsoft.com/v1.0/me/events',
      {
        method: 'POST',
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to create Outlook event: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return {
      id: data.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      labels: task.labels || [],
      assignee: task.assignee,
      priority: task.priority,
      externalUrl: `https://outlook.office.com/calendar/`,
      createdAt: new Date().toISOString(),
      eventId: data.id,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.graphApiFetch(
        'https://graph.microsoft.com/v1.0/me'
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async getSyncStatus(): Promise<{
    lastSync: Date;
    pendingChanges: number;
    errors: string[];
  }> {
    return {
      lastSync: this.config.lastSyncAt
        ? new Date(this.config.lastSyncAt)
        : new Date(0),
      pendingChanges: 0,
      errors: [],
    };
  }

  /**
   * Get user profile from Outlook
   */
  async getUserProfile(): Promise<{
    id: string;
    displayName: string;
    email: string;
  }> {
    const response = await this.graphApiFetch(
      'https://graph.microsoft.com/v1.0/me'
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Outlook profile: ${response.statusText}`
      );
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
  async refreshAccessTokenIfNeeded(): Promise<string | null> {
    if (!this.refreshTokenValue) return null;

    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const response = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: this.refreshTokenValue,
          grant_type: 'refresh_token',
        }).toString(),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    this.apiToken = data.access_token;
    if (data.refresh_token) {
      this.refreshTokenValue = data.refresh_token;
    }

    return data.access_token;
  }

  /**
   * Get Outlook OAuth2 authorization URL
   */
  static getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID || '',
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/outlook`,
      response_type: 'code',
      scope:
        'https://graph.microsoft.com/Calendars.ReadWrite offline_access openid profile',
      state,
      prompt: 'consent',
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
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
        `Token exchange failed: ${error.error_description || response.statusText}`
      );
    }

    return response.json();
  }

  private graphApiFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      },
    });
  }

  private mapOutlookEventToTask(event: any): OutlookCalendarRecord | null {
    // Only convert events that appear to be task-related
    const hasTaskKeywords = /task|todo|meeting|appointment|deadline/i.test(
      event.subject || ''
    );

    if (!hasTaskKeywords && !event.isReminderOn) {
      return null;
    }

    return {
      id: event.id,
      title: event.subject,
      description: event.body?.content || '',
      dueDate: event.start?.dateTime,
      labels: event.categories || [],
      assignee: event.attendees?.[0]?.emailAddress?.address,
      priority: this.extractPriorityFromEvent(event),
      eventId: event.id,
      attendees: event.attendees,
      body: event.body?.content || '',
      sensitivity: event.sensitivity || 'normal',
      externalUrl: event.webLink,
      createdAt: new Date().toISOString(),
    };
  }

  private extractDueDateFromEvent(
    event: OutlookCalendarRecord
  ): string | undefined {
    return event.dueDate || undefined;
  }

  private extractPriorityFromEvent(
    event: OutlookCalendarRecord
  ): 'low' | 'medium' | 'high' | 'critical' | undefined {
    const categories = event.categories?.join(' ').toLowerCase() || '';

    if (categories.includes('urgent') || categories.includes('critical')) {
      return 'critical';
    }
    if (categories.includes('high') || categories.includes('important')) {
      return 'high';
    }
    if (categories.includes('low') || categories.includes('deferred')) {
      return 'low';
    }

    return undefined;
  }
}
