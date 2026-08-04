/**
 * Notion Integration Connector
 * Sync Notion pages and databases with TaskFlow tasks
 *
 * Requires: Notion Integration Token, Database IDs
 * Scope: pages:read, pages:write, databases:read
 */

import { BaseConnector, IntegrationConfig, ExternalRecord, NotionPageRecord } from './base-connector';

export class NotionConnector extends BaseConnector {
  readonly id = 'notion';
  readonly type = 'notion';
  readonly name = 'Notion';

  private apiToken: string;
  private databaseIds: string[];

  constructor(config: IntegrationConfig & { apiToken: string; databaseIds?: string | string[] }) {
    super(config);
    this.apiToken = config.apiToken;
    if (typeof config.databaseIds === 'string') {
      this.databaseIds = config.databaseIds
        ?.split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0) || [];
    } else if (Array.isArray(config.databaseIds)) {
      this.databaseIds = config.databaseIds.filter(d => d.length > 0);
    } else {
      this.databaseIds = [];
    }
  }

  async authenticate(credentials: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  } = {}): Promise<{ accessToken: string; refreshToken?: string; expiresAt: string }> {
    if (!credentials.accessToken) {
      throw new Error('Notion integration requires an access token');
    }

    this.apiToken = credentials.accessToken;
    this.accessToken = credentials.accessToken;

    // Notion tokens don't expire in the traditional sense
    const expiresAt = new Date(Date.now() + 86400000 * 365).toISOString(); // 1 year

    return {
      accessToken: credentials.accessToken,
      expiresAt,
    };
  }

  async fetchRecords(since?: Date, options?: { limit?: number; cursor?: string }): Promise<NotionPageRecord[]> {
    const records: NotionPageRecord[] = [];

    // Fetch from configured databases
    for (const databaseId of this.databaseIds) {
      let cursor = options?.cursor;
      let hasMore = true;
      let iterations = 0;
      const maxIterations = 100; // Safety limit

      while (hasMore && iterations < maxIterations) {
        iterations++;

        const response = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start_cursor: cursor,
            page_size: options?.limit || 100,
            filter: since
              ? {
                  property: 'Last edited time',
                  date: {
                   greater_than: since.toISOString(),
                  },
                }
              : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`Notion API error: ${response.statusText}`);
        }

        const data = await response.json();

        for (const page of data.results) {
          const mappedRecord = this.mapNotionPageToTask(page);
          records.push(mappedRecord);
        }

        hasMore = data.has_more;
        cursor = data.next_cursor;
      }
    }

    return records;
  }

  mapToTask(record: NotionPageRecord): {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  } {
    return super.mapToTask(record);
  }

  private mapNotionPageToTask(page: Record<string, unknown>): NotionPageRecord {
    const title = this.extractTitle(page);
    const description = this.extractDescription(page);
    const dueDate = this.extractDueDate(page);
    const labels = this.extractLabels(page);
    const priority = this.extractPriority(page);
    const assignee = this.extractAssignee(page);
    const parentPage = (page.parent as Record<string, unknown> | undefined)?.database_id as string || '';

    return {
      id: page.id as string,
      title,
      description,
      dueDate,
      labels,
      assignee,
      priority,
      status: page.status as string,
      externalUrl: page.url as string,
      createdAt: new Date().toISOString(),
      updatedAt: page.last_edited_time as string,
      parentPage,
      properties: (page.properties as Record<string, unknown>) || {},
    };
  }

  private extractTitle(page: Record<string, unknown>): string {
    // Notion title is in properties.title.title array
    const properties = page.properties as Record<string, unknown>;
    const titleProp = properties?.title as Record<string, unknown> | undefined;
    const titleArray = (titleProp?.title as Array<Record<string, unknown>>) || [];

    return titleArray.map(t => t.plain_text).join('') || 'Untitled Page';
  }

  private extractDescription(page: Record<string, unknown>): string | undefined {
    const properties = page.properties as Record<string, unknown>;
    const desciptionProp = properties?.description as Record<string, unknown> | undefined;

    if (!desciptionProp) return undefined;

    const richText = (desciptionProp as Record<string, unknown>).rich_text as Array<Record<string, unknown>> || [];
    return richText.map(t => t.plain_text).join('');
  }

  private extractDueDate(page: Record<string, unknown>): string | undefined {
    const properties = page.properties as Record<string, unknown>;
    const dateProp = properties?.Due as Record<string, unknown> | undefined;

    if (!dateProp) return undefined;

    const dateObj = (dateProp as Record<string, unknown>).date as Record<string, unknown> | null;
    if (!dateObj) return undefined;

    return dateObj.start as string | undefined;
  }

  private extractLabels(page: Record<string, unknown>): string[] | undefined {
    const properties = page.properties as Record<string, unknown>;
    const tagsProp = properties?.Tags as Record<string, unknown> | undefined;

    if (!tagsProp) return undefined;

    const multiSelect = (tagsProp as Record<string, unknown>).multi_select as Array<Record<string, unknown>> || [];
    return multiSelect.map((t: Record<string, unknown>) => t.name as string);
  }

  private extractPriority(page: Record<string, unknown>): 'low' | 'medium' | 'high' | 'critical' | undefined {
    const properties = page.properties as Record<string, unknown>;
    const priorityProp = properties?.Priority as Record<string, unknown> | undefined;

    if (!priorityProp) return undefined;

    const select = (priorityProp as Record<string, unknown>).select as Record<string, unknown> | null;
    if (!select) return undefined;

    const priorityName = select.name as string;
    const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      '🔴 Critical': 'critical',
      '🟠 High': 'high',
      '🟡 Medium': 'medium',
      '🟢 Low': 'low',
    };

    return priorityMap[priorityName] || 'medium';
  }

  private extractAssignee(page: Record<string, unknown>): string | undefined {
    const properties = page.properties as Record<string, unknown>;
    const personProp = properties?.Assignee as Record<string, unknown> | undefined;

    if (!personProp) return undefined;

    const people = (personProp as Record<string, unknown>).people as Array<Record<string, unknown>> || [];
    if (people.length === 0) return undefined;

    // Return the first person's email or name
    const person = people[0] as Record<string, unknown>;
    return (person.email as string) || (person.name as string);
  }

  async pushTask(task: {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<NotionPageRecord> {
    // Notion requires a database ID to create pages
    if (this.databaseIds.length === 0) {
      throw new Error('No database configured for Notion integration');
    }

    const databaseId = this.databaseIds[0];

    const properties: Record<string, unknown> = {
      title: {
        type: 'title',
        title: [{ type: 'text', text: { content: task.title } }],
      },
    };

    if (task.description) {
      properties.description = {
        type: 'rich_text',
        rich_text: [{ type: 'text', text: { content: task.description } }],
      };
    }

    if (task.dueDate) {
      properties.Due = {
        type: 'date',
        date: { start: task.dueDate },
      };
    }

    if (task.labels && task.labels.length > 0) {
      properties.Tags = {
        type: 'multi_select',
        multi_select: task.labels.map(label => ({ name: label })),
      };
    }

    if (task.priority) {
      const priorityMap: Record<typeof task.priority extends 'low' | 'medium' | 'high' | 'critical' ? typeof task.priority : never, Record<string, unknown>> = {
        low: { name: '🟢 Low', color: 'green' },
        medium: { name: '🟡 Medium', color: 'yellow' },
        high: { name: '🟠 High', color: 'orange' },
        critical: { name: '🔴 Critical', color: 'red' },
      };

      properties.Priority = {
        type: 'select',
        select: priorityMap[task.priority],
      };
    }

    if (task.assignee) {
      properties.Assignee = {
        type: 'people',
        people: [{ id: task.assignee }], // Would need to resolve to user ID
      };
    }

    const response = await fetch(`https://api.notion.com/v1/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`);
    }

    const createdPage = await response.json();
    return this.mapNotionPageToTask(createdPage);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Notion-Version': '2022-06-28',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}