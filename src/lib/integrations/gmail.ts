/**
 * Gmail Integration Connector
 * Sync emails as tasks with labels and threads
 *
 * Requires: Gmail API OAuth2 credentials
 * Scope: https://www.googleapis.com/auth/gmail.readonly
 *        https://www.googleapis.com/auth/gmail.modify
 */

import { BaseConnector, IntegrationConfig, EmailRecord } from './base-connector';

export class GmailConnector extends BaseConnector {
  readonly id = 'gmail';
  readonly type = 'gmail';
  readonly name = 'Gmail';

  private apiToken: string;
  private userId = 'me';

  constructor(config: IntegrationConfig & { apiToken: string; userId?: string }) {
    super(config);
    this.apiToken = config.apiToken;
    if (config.userId) {
      this.userId = config.userId;
    }
  }

  async authenticate(credentials: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  } = {}): Promise<{ accessToken: string; refreshToken?: string; expiresAt: string }> {
    if (!credentials.accessToken) {
      throw new Error('Gmail integration requires an access token');
    }

    this.apiToken = credentials.accessToken;
    return {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };
  }

  async fetchRecords(since?: Date, options?: { limit?: number; cursor?: string }): Promise<EmailRecord[]> {
    const records: EmailRecord[] = [];

    // Build query for messages
    const query = `newer_than:${this.formatDateDelta(since)}`;

    // List messages
    const listResponse = await this.gmailApiFetch(`https://gmail.googleapis.com/gmail/v1/users/${this.userId}/messages?q=${encodeURIComponent(query)}${options?.limit ? `&maxResults=${options.limit}` : ''}`);

    if (!listResponse.ok) {
      const error = await listResponse.text();
      throw new Error(`Gmail API error: ${error}`);
    }

    const listData = await listResponse.json();
    const messageIds = listData.messages?.map((m: { id: string }) => m.id) || [];

    // Fetch message details in batches
    for (const msgId of messageIds) {
      try {
        const msgResponse = await this.gmailApiFetch(
          `https://gmail.googleapis.com/gmail/v1/users/${this.userId}/messages/${msgId}?format=FULL`,
        );

        if (msgResponse.ok) {
          const msgData = await msgResponse.json();
          const record = this.mapGmailMessageToTask(msgData);
          if (record) {
            records.push(record);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch message ${msgId}:`, error);
      }
    }

    return records;
  }

  private formatDateDelta(since?: Date): string {
    if (!since) return '1d';

    const days = Math.ceil((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
    return `${days}d`;
  }

  mapToTask(record: EmailRecord): {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  } {
    return {
      title: record.title,
      description: record.body,
      dueDate: this.extractDueDate(record.body),
      labels: record.recipients.length ? [`to:${record.sender}`] : undefined,
      assignee: record.sender,
      priority: this.extractPriority(record.subject, record.recipients),
    };
  }

  async pushTask(_task: {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<EmailRecord> {
    throw new Error('pushTask not implemented for Gmail connector - requires email service integration');
  }

  private mapGmailMessageToTask(message: Record<string, unknown>): EmailRecord | null {
    const payload = message.payload as Record<string, unknown>;
    const headers = (payload.headers as Array<{ name: string; value: string }>) || [];

    // Extract headers
    const getHeader = (name: string): string => {
      const header = headers.find((h) => h.name === name);
      return header?.value || '';
    };

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To');
    const date = getHeader('Date');

    // Parse sender email
    const senderMatch = from.match(/<?([^>]+)>?/);
    const sender = senderMatch?.[1] || from;

    // Parse recipients
    const recipients = to.split(',').map((r) => r.trim()).filter(Boolean);

    // Get body content
    const body = this.extractBody(payload);

    // Check if this email should become a task
    if (!this.isTaskCandidate(subject, body)) {
      return null;
    }

    return {
      id: (message as Record<string, unknown>).id as string,
      title: this.extractTitle(subject),
      description: body,
      dueDate: this.extractDueDate(body),
      labels: this.extractLabels(message),
      assignee: sender,
      sender,
      recipients,
      subject,
      threadId: (message as Record<string, unknown>).threadId as string,
      body,
      createdAt: new Date().toISOString(),
      updatedAt: date,
      externalUrl: `https://mail.google.com/mail/u/0/#inbox/${(message as Record<string, unknown>).id}`,
    };
  }

  private extractBody(payload: Record<string, unknown>): string {
    const parts = (payload.parts as Array<Record<string, unknown>>) || [];

    for (const part of parts) {
      if (part.mimeType === 'text/plain') {
        const body = part.body as Record<string, unknown> | undefined;
        const data = body?.data as string | undefined;
        if (data) {
          return this.base64Decode(data);
        }
      }
    }

    // If no plain text, try HTML
    for (const part of parts) {
      if (part.mimeType === 'text/html') {
        const body = part.body as Record<string, unknown> | undefined;
        const data = body?.data as string | undefined;
        if (data) {
          return this.stripHtml(this.base64Decode(data));
        }
      }
    }

    return '';
  }

  private base64Decode(str: string): string {
    try {
      // Handle URL-safe base64
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      return atob(base64);
    } catch {
      return str;
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isTaskCandidate(subject: string, body: string): boolean {
    const text = (subject + ' ' + body).toLowerCase();

    // Task-related keywords
    const taskKeywords = ['task:', 'todo:', 'action:', 'follow up', 'follow-up', 'please', 'help', 'need'];

    // Check for task markers
    const hasTaskMarker = taskKeywords.some((keyword) => text.includes(keyword));

    // Check for action verbs
    const hasActionVerb = /\b(create|implement|review|fix|deploy|schedule|assign|complete)\b/.test(text);

    return hasTaskMarker || hasActionVerb;
  }

  private extractTitle(subject: string): string {
    // Remove Re:, Fwd:, etc.
    return subject.replace(/^(Re|Fwd):\s*/i, '').trim() || 'No subject';
  }

  private extractDueDate(body: string): string | undefined {
    // Look for due date patterns
    const patterns = [
      /due\s*(?:by\s*)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      /deadline\s*:?\s*(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      /by\s+(?:(\d+)(?:\s*(day|week|month|year))|(\w+\s+\d{1,2}))/i,
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractLabels(message: Record<string, unknown>): string[] | undefined {
    const labels: string[] = [];

    // Extract from Gmail labels
    const labelIds = (message.labelIds as string[]) || [];

    const labelMap: Record<string, string> = {
      INBOX: 'Inbox',
      IMPORTANT: 'Important',
      STARRED: 'Starred',
      CATEGORY_PERSONAL: 'Personal',
      CATEGORY_WORK: 'Work',
    };

    for (const labelId of labelIds) {
      if (labelMap[labelId]) {
        labels.push(labelMap[labelId]);
      } else {
        labels.push(labelId);
      }
    }

    return labels.length > 0 ? labels : undefined;
  }

  private extractPriority(subject: string, recipients: string[]): 'low' | 'medium' | 'high' | 'critical' | undefined {
    const text = (subject + ' ' + recipients.join(' ')).toLowerCase();

    if (text.includes('urgent') || text.includes('asap') || text.includes('critical')) {
      return 'critical';
    }
    if (text.includes('high') || text.includes('important')) {
      return 'high';
    }
    if (text.includes('low') || text.includes('deferred')) {
      return 'low';
    }

    return undefined;
  }

  private async gmailApiFetch(url: string): Promise<Response> {
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get threads for a user
   */
  async getThreads(options?: { maxResults?: number; q?: string }): Promise<Array<{ id: string; subject: string; snippet: string; messages: number }>> {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${this.userId}/threads${options?.maxResults ? `?maxResults=${options.maxResults}` : ''}${options?.q ? `?q=${encodeURIComponent(options.q)}` : ''}`;

    const response = await this.gmailApiFetch(url);
    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();
    return data.threads?.map((t: Record<string, unknown>) => ({
      id: t.id as string,
      subject: (t as Record<string, unknown>).subject as string,
      snippet: (t as Record<string, unknown>).snippet as string,
      messages: ((t as Record<string, unknown>).messages as Array<Record<string, unknown>>)?.length || 0,
    })) || [];
  }

  /**
   * Create draft email
   */
  async createDraft(to: string, subject: string, body: string): Promise<{ id: string; draftId: string }> {
    const emailHeaders = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
    ].join('\r\n');

    const raw = Buffer.from(`${emailHeaders}\r\n\r\n${body}`)
      .toString('base64')
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${this.userId}/drafts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          raw,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      draftId: data.id,
    };
  }

  /**
   * Send email
   */
  async sendEmail(to: string, subject: string, body: string): Promise<{ id: string }> {
    const emailHeaders = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
    ].join('\r\n');

    const raw = Buffer.from(`${emailHeaders}\r\n\r\n${body}`)
      .toString('base64')
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${this.userId}/messages?labelIds=INBOX`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();
    return { id: data.id };
  }

  /**
   * Add label to message
   */
  async addLabel(messageId: string, label: string): Promise<boolean> {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${this.userId}/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLabelIds: [label],
      }),
    });

    const data = await response.json();
    return response.ok && !data.error;
  }

  /**
   * Remove label from message
   */
  async removeLabel(messageId: string, label: string): Promise<boolean> {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${this.userId}/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        removeLabelIds: [label],
      }),
    });

    const data = await response.json();
    return response.ok && !data.error;
  }

  /**
   * Create a label
   */
  async createLabel(name: string, labelListName?: string): Promise<{ id: string; name: string }> {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${this.userId}/labels`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        labelListName: labelListName || name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      }),
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<{
    email: string;
    displayName: string;
    pictureUrl: string;
  }> {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/profile`, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    return response.json();
  }
}