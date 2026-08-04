/**
 * Base Integration Connector
 * Foundation for third-party app integrations (Notion, GitHub, Slack, Gmail)
 */

export interface IntegrationConfig {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  webhookUrl?: string;
  syncDirection: 'import' | 'export' | 'bidirectional';
  lastSyncAt?: string;
  fieldMappings?: Record<string, string>;
  syncRules?: Record<string, unknown>;
}

export interface ExternalRecord {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  labels?: string[];
  assignee?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
  externalUrl?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface EmailRecord extends ExternalRecord {
  sender: string;
  recipients: string[];
  subject: string;
  body: string;
}

export interface GitHubIssueRecord extends ExternalRecord {
  repository: string;
  assignee: string;
  labels: string[];
  state: 'open' | 'closed';
  comments: number;
  url: string;
}

export interface SlackMessageRecord extends ExternalRecord {
  channel: string;
  user: string;
  threadTs?: string;
  reactions: string[];
}

export interface NotionPageRecord extends ExternalRecord {
  parentPage: string;
  properties: Record<string, unknown>;
  children?: Array<{
    type: string;
    content: string;
  }>;
}

export interface IntegrationConnector {
  id: string;
  type: string;
  name: string;

  /**
   * Authenticate with the external service
   */
  authenticate(credentials: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: string;
  }>;

  /**
   * Fetch records from the external service
   */
  fetchRecords(since?: Date, options?: { limit?: number; cursor?: string }): Promise<ExternalRecord[]>;

  /**
   * Map an external record to a local task
   */
  mapToTask(record: ExternalRecord, fieldMappings?: Record<string, string>): {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };

  /**
   * Push a local task to the external service
   */
  pushTask(task: {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<ExternalRecord>;

  /**
   * Test the connection
   */
  testConnection(): Promise<boolean>;

  /**
   * Get sync status
   */
  getSyncStatus(): Promise<{
    lastSync: Date;
    pendingChanges: number;
    errors: string[];
  }>;
}

/**
 * Base implementation of IntegrationConnector
 */
export abstract class BaseConnector implements IntegrationConnector {
  abstract id: string;
  abstract type: string;
  abstract name: string;

  protected config: IntegrationConfig;
  protected accessToken: string | null = null;

  constructor(config: IntegrationConfig) {
    this.config = config;
    this.accessToken = config.accessToken || null;
  }

  async authenticate(credentials: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  }): Promise<{ accessToken: string; refreshToken?: string; expiresAt: string }> {
    // Base implementation - subclasses should override
    if (credentials.accessToken) {
      this.accessToken = credentials.accessToken;
      return {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      };
    }
    throw new Error('Authentication failed');
  }

  abstract fetchRecords(since?: Date, options?: { limit?: number; cursor?: string }): Promise<ExternalRecord[]>;

  mapToTask(record: ExternalRecord, fieldMappings?: Record<string, string>): {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  } {
    // Default mapping - subclasses should customize
    return {
      title: record.title || 'Untitled',
      description: record.description,
      dueDate: record.dueDate,
      labels: record.labels || [],
      assignee: record.assignee,
      priority: record.priority,
    };
  }

  abstract pushTask(task: {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<ExternalRecord>;

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchRecords(undefined, { limit: 1 });
      return true;
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
      lastSync: this.config.lastSyncAt ? new Date(this.config.lastSyncAt) : new Date(0),
      pendingChanges: 0,
      errors: [],
    };
  }
}