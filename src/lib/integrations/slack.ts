/**
 * Slack Integration Connector
 * Sync Slack channel messages with TaskFlow tasks
 *
 * Requires: Slack Bot Token or User Token
 * Scope: channels:read, chat:write, users:read, groups:read
 */

import { BaseConnector, IntegrationConfig, SlackMessageRecord } from './base-connector';

export class SlackConnector extends BaseConnector {
  readonly id = 'slack';
  readonly type = 'slack';
  readonly name = 'Slack';

  private apiToken: string;
  private defaultChannelId: string | null = null;

  constructor(config: IntegrationConfig & { apiToken: string; defaultChannelId?: string }) {
    super(config);
    this.apiToken = config.apiToken;
    this.defaultChannelId = config.defaultChannelId || null;
  }

  async authenticate(credentials: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  } = {}): Promise<{ accessToken: string; refreshToken?: string; expiresAt: string }> {
    if (!credentials.accessToken) {
      throw new Error('Slack integration requires an access token');
    }

    this.apiToken = credentials.accessToken;
    this.accessToken = credentials.accessToken;

    // Slack bot tokens typically don't expire, but we'll set a reasonable expiry
    const expiresAt = new Date(Date.now() + 86400000 * 365).toISOString(); // 1 year

    return {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt,
    };
  }

  /**
   * Fetch messages from Slack channels
   */
  async fetchRecords(since?: Date, options?: { channelId?: string; limit?: number }): Promise<SlackMessageRecord[]> {
    const channelId = options?.channelId || this.defaultChannelId;

    if (!channelId) {
      throw new Error('No channel specified for Slack integration');
    }

    const records: SlackMessageRecord[] = [];

    try {
      // Get channel messages
      const response = await fetch('https://slack.com/api/conversations.history', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
      }

      const messages = data.messages || [];

      for (const message of messages) {
        try {
          const mappedRecord = await this.mapSlackMessageToTask(message, channelId);
          if (mappedRecord && await this.isTaskCandidate(message)) {
            records.push(mappedRecord);
          }
        } catch (error) {
          console.warn(`Failed to map message ${message.ts}:`, error);
        }
      }

      return records;
    } catch (error) {
      console.error('Error fetching Slack records:', error);
      throw error;
    }
  }

  /**
   * Check if a message should be converted to a task
   */
  private async isTaskCandidate(message: Record<string, unknown>): Promise<boolean> {
    // Check for task-related keywords or mentions
    const text = (message.text as string) || '';
    const lowerText = text.toLowerCase();

    // Keywords that indicate task creation
    const taskKeywords = ['todo:', 'task:', '@todo', '@task', 'reminder:', 'due:'];

    // Check for karma-style task markers or @ mentions with action verbs
    const hasTaskMarker = taskKeywords.some((keyword) => lowerText.includes(keyword));
    const hasActionVerbs = /\b(assign|complete|schedule|remind|follow up|follow-up)\b/.test(lowerText);

    return hasTaskMarker || hasActionVerbs;
  }

  /**
   * Map Slack message to task record
   */
  private async mapSlackMessageToTask(
    message: Record<string, unknown>,
    channelId: string,
  ): Promise<SlackMessageRecord | null> {
    const text = (message.text as string) || '';

    // Try to extract title from message
    const title = this.extractTitle(text, message.ts as string);
    if (!title) return null;

    // Extract assignee from reaction or user info
    const assignee = (message.username as string) || (message.user as string);

    // Get channel name
    const channel = await this.getChannelName(channelId);

    return {
      id: `${channelId}:${(message.ts as string)}`,
      title,
      description: this.extractDescription(text),
      labels: this.extractLabels(message),
      assignee,
      status: 'pending',
      reactions: this.extractReactions(message),
      threadTs: message.thread_ts as string,
      channel,
      user: assignee || 'unknown',
      externalUrl: `https://slack.com/archives/${channelId}/p${(message.ts as string).replace('.', '')}`,
      createdAt: new Date(parseFloat(message.ts as string) * 1000).toISOString(),
      updatedAt: message.edited
        ? new Date(parseFloat((message.edited as Record<string, unknown>).ts as string) * 1000).toISOString()
        : undefined,
    };
  }

  private extractTitle(text: string, _ts: string): string | null {
    // Try to extract title from various formats
    const patterns = [
      /todo:\s*(.+)/i,
      /task:\s*(.+)/i,
      /reminder:\s*(.+)/i,
      /due:\s*(.+)/i,
      /@todo\s+(.+)/i,
      /@task\s+(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no pattern matched, check if message has action verbs
    const actionVerbs = ['assign', 'complete', 'schedule', 'remind', 'follow up'];
    const hasActionVerb = actionVerbs.some((verb) => text.toLowerCase().includes(verb));

    if (hasActionVerb) {
      // Use first line as title
      const firstLine = text.split('\n')[0].trim();
      return firstLine.length > 0 && firstLine.length < 200 ? firstLine : null;
    }

    return null;
  }

  private extractDescription(text: string): string | undefined {
    // Return full text minus the title prefix
    const lines = text.split('\n');

    // Remove common task prefixes from description
    const descLines = lines.slice(1).filter((line) => line.trim().length > 0);

    return descLines.length > 0 ? descLines.join('\n') : (text.length > 100 ? text.substring(0, 200) + '...' : undefined);
  }

  private extractLabels(message: Record<string, unknown>): string[] | undefined {
    const labels: string[] = [];

    // Extract from channel name
    const channelName = (message.channel as string) || '';
    if (channelName) {
      const cleanName = channelName.replace(/[-_]/g, ' ');
      labels.push(cleanName);
    }

    // Extract from emoji reactions (priority)
    const reactions = (message.reactions as Array<{ name: string; count: number }>) || [];
    const priorityEmojis = {
      urgent: ['😱', '🔥', '⚠️'],
      high: ['🚀', '⭐', '✅'],
      medium: ['😊', '👍', 'medium'],
      low: ['🙂', '👌', 'low'],
    };

    for (const [priority, emojis] of Object.entries(priorityEmojis)) {
      if (reactions.some((r) => emojis.includes(r.name))) {
        labels.push(priority);
        break;
      }
    }

    return labels.length > 0 ? labels : undefined;
  }

  private extractReactions(message: Record<string, unknown>): string[] {
    const reactions = (message.reactions as Array<{ name: string; count: number }>) || [];
    return reactions.map((r) => `:${r.name}: ${r.count}`);
  }

  private async getChannelName(channelId: string): Promise<string> {
    try {
      const response = await fetch('https://slack.com/api/conversations.info', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          return data.channel?.name || channelId;
        }
      }
    } catch {
      // Ignore errors
    }

    return channelId;
  }

  /**
   * Get unread mentions for a user
   */
  async getMentions(options?: { userId?: string; channelId?: string }): Promise<SlackMessageRecord[]> {
    const userId = options?.userId || 'U01234567'; // Default to current user
    const channelId = options?.channelId || this.defaultChannelId;

    if (!channelId) {
      throw new Error('No channel specified for Slack mentions');
    }

    const response = await fetch(
      `https://slack.com/api/conversations.history?channel=${channelId}&exclude_archived=true`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    const data = await response.json();
    const messages = data.messages || [];

    // Filter for mentions
    const mentionedMessages = messages.filter((message: Record<string, unknown>) => {
      const text = (message.text as string) || '';
      return text.toLowerCase().includes(`<@${userId}>`) || text.includes('<!subteam');
    });

    return Promise.all(
      mentionedMessages.map(async (message: Record<string, unknown>) =>
        this.mapSlackMessageToTask(message, channelId),
      ),
    );
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(channelId: string, text: string, options?: { threadTs?: string }): Promise<boolean> {
    const body: Record<string, unknown> = {
      channel: channelId,
      text,
    };

    if (options?.threadTs) {
      body.thread_ts = options.threadTs;
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data.ok === true;
  }

  /**
   * Update a message
   */
  async updateMessage(channelId: string, ts: string, text: string): Promise<boolean> {
    const response = await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        ts,
        text,
      }),
    });

    const data = await response.json();
    return data.ok === true;
  }

  /**
   * Get channel list
   */
  async getChannelList(types?: Array<'public_channel' | 'private_channel' | 'mpim' | 'im' | 'mpdm'>): Promise<
    Array<{ id: string; name: string; is_private: boolean }>
  > {
    const allChannels: Array<{ id: string; name: string; is_private: boolean }> = [];
    let cursor: string | undefined;

    do {
      const response = await fetch(
        `https://slack.com/api/conversations.list?types=${types?.join(',') || 'public_channel'}${cursor ? `&cursor=${cursor}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) break;

      const data = await response.json();
      if (!data.ok) break;

      const channels = data.channels || [];
      allChannels.push(
        ...channels.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: c.name as string,
          is_private: c.is_private as boolean,
        })),
      );

      cursor = data.response_metadata?.next_cursor;
    } while (cursor);

    return allChannels;
  }

  /**
   * Test connection by getting current user info
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data.ok === true && data.user_id !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<{
    id: string;
    name: string;
    profile?: {
      email?: string;
      real_name?: string;
      image_48?: string;
    };
  }> {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
    }

    const user = data.user;
    return {
      id: user.id,
      name: user.name,
      profile: user.profile,
    };
  }

  /**
   * Get reactions on a message
   */
  async getReactions(channelId: string, ts: string): Promise<Array<{ name: string; users: string[]; count: number }>> {
    const response = await fetch(
      `https://slack.com/api/reactions.get?channel=${channelId}&timestamp=${ts}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.message?.reactions || [];
  }

  /**
   * Add reaction to a message
   */
  async addReaction(channelId: string, ts: string, reaction: string): Promise<boolean> {
    const response = await fetch('https://slack.com/api/reactions.add', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        timestamp: ts,
        name: reaction,
      }),
    });

    const data = await response.json();
    return data.ok === true;
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(channelId: string, ts: string, reaction: string): Promise<boolean> {
    const response = await fetch('https://slack.com/api/reactions.remove', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        timestamp: ts,
        name: reaction,
      }),
    });

    const data = await response.json();
    return data.ok === true;
  }

  async pushTask(_task: {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<SlackMessageRecord> {
    throw new Error('pushTask not implemented for Slack connector - requires channel configuration');
  }
}