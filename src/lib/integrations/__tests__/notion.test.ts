import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotionConnector } from '../notion';

// Mock fetch
global.fetch = vi.fn();

describe('NotionConnector', () => {
  let connector: NotionConnector;

  beforeEach(() => {
    vi.resetAllMocks();
    connector = new NotionConnector({
      id: 'test-notion',
      type: 'notion',
      name: 'Test Notion Integration',
      enabled: true,
      apiToken: 'test-token',
      databaseIds: ['test-db-id'],
      syncDirection: 'bidirectional',
    });
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(connector.id).toBe('notion');
      expect(connector.type).toBe('notion');
      expect(connector.name).toBe('Notion');
    });

    it('should parse comma-separated database IDs', () => {
      const multiDbConnector = new NotionConnector({
        id: 'multi-notion',
        type: 'notion',
        name: 'Multi DB Notion',
        enabled: true,
        apiToken: 'token',
        databaseIds: 'db1,db2,db3',
        syncDirection: 'import',
      });

      // Access private property for testing
      expect((multiDbConnector as any).databaseIds).toEqual([
        'db1',
        'db2',
        'db3',
      ]);
    });
  });

  describe('authenticate', () => {
    it('should store access token and return auth result', async () => {
      const result = await connector.authenticate({
        accessToken: 'new-test-token',
      });

      expect(result.accessToken).toBe('new-test-token');
      expect(result.expiresAt).toBeDefined();
    });

    it('should throw error when no access token provided', async () => {
      await expect(connector.authenticate({})).rejects.toThrow(
        'Notion integration requires an access token'
      );
    });
  });

  describe('testConnection', () => {
    it('should return true when API response is ok', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const result = await connector.testConnection();
      expect(result).toBe(true);
    });

    it('should return false when API response fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const result = await connector.testConnection();
      expect(result).toBe(false);
    });

    it('should return false on fetch error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await connector.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('fetchRecords', () => {
    it('should fetch pages from configured databases', async () => {
      const mockPage = {
        id: 'page-1',
        properties: {
          title: { title: [{ plain_text: 'Test Page' }] },
          Due: { date: { start: '2024-01-15' } },
          Tags: { multi_select: [{ name: 'Urgent' }] },
        },
        url: 'https://notion.co/page-1',
        status: 'Published',
        last_edited_time: '2024-01-10T10:00:00Z',
        parent: { database_id: 'test-db-id' },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [mockPage],
          has_more: false,
        }),
      });

      const records = await connector.fetchRecords();

      expect(records).toHaveLength(1);
      expect(records[0].title).toBe('Test Page');
      expect(records[0].dueDate).toBe('2024-01-15');
      expect(records[0].labels).toContain('Urgent');
    });

    it('should handle pagination with cursor', async () => {
      const mockPage1 = {
        id: 'page-1',
        properties: {
          title: { title: [{ plain_text: 'Page 1' }] },
        },
        url: 'https://notion.co/page-1',
        last_edited_time: '2024-01-10T10:00:00Z',
        parent: { database_id: 'test-db-id' },
        status: 'Published',
      };

      const mockPage2 = {
        id: 'page-2',
        properties: {
          title: { title: [{ plain_text: 'Page 2' }] },
        },
        url: 'https://notion.co/page-2',
        last_edited_time: '2024-01-10T10:00:00Z',
        parent: { database_id: 'test-db-id' },
        status: 'Published',
      };

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [mockPage1],
            has_more: true,
            next_cursor: 'cursor-2',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [mockPage2],
            has_more: false,
          }),
        });

      const records = await connector.fetchRecords();

      expect(records).toHaveLength(2);
    });

    it('should throw error when API response fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(connector.fetchRecords()).rejects.toThrow(
        'Notion API error'
      );
    });
  });

  describe('pushTask', () => {
    it('should create a task in Notion database', async () => {
      const mockCreatedPage = {
        id: 'new-page-id',
        properties: {
          title: { title: [{ plain_text: 'New Task' }] },
        },
        url: 'https://notion.co/new-page-id',
        last_edited_time: '2024-01-10T11:00:00Z',
        parent: { database_id: 'test-db-id' },
        status: 'Published',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedPage,
      });

      const result = await connector.pushTask({
        title: 'New Task',
        description: 'Task description',
        dueDate: '2024-01-20',
        labels: ['Development', 'Backend'],
        priority: 'high',
      });

      expect(result.title).toBe('New Task');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.notion.com/v1/pages',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw error when no database configured', async () => {
      const noDbConnector = new NotionConnector({
        id: 'no-db',
        type: 'notion',
        name: 'No DB Notion',
        enabled: true,
        apiToken: 'token',
        databaseIds: undefined,
        syncDirection: 'import',
      });

      await expect(noDbConnector.pushTask({ title: 'Test' })).rejects.toThrow(
        'No database configured for Notion integration'
      );
    });

    it('should include all task fields in API call', async () => {
      const mockCreatedPage = {
        id: 'new-page-id',
        properties: {},
        url: 'https://notion.co/new-page-id',
        last_edited_time: '2024-01-10T11:00:00Z',
        parent: { database_id: 'test-db-id' },
        status: 'Published',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedPage,
      });

      await connector.pushTask({
        title: 'Complex Task',
        description: 'Detailed description',
        dueDate: '2024-02-01',
        labels: ['Bug', 'Urgent'],
        priority: 'critical',
        assignee: 'user-123',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );

      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.properties.title.title[0].text.content).toBe('Complex Task');
      expect(body.properties.description.rich_text[0].text.content).toBe(
        'Detailed description'
      );
    });

    it('should throw error when API response fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(connector.pushTask({ title: 'Test Task' })).rejects.toThrow(
        'Notion API error: Internal Server Error'
      );
    });
  });

  describe('extractTitle', () => {
    it('should extract title from Notion page property', () => {
      const page = {
        properties: {
          title: {
            title: [{ plain_text: 'Task ' }, { plain_text: 'Title' }],
          },
        },
      };

      const result = (connector as any).extractTitle(page);
      expect(result).toBe('Task Title');
    });

    it('should return Untitled Page when no title', () => {
      const page = { properties: {} };
      const result = (connector as any).extractTitle(page);
      expect(result).toBe('Untitled Page');
    });
  });

  describe('extractDueDate', () => {
    it('should extract due date from Due property', () => {
      const page = {
        properties: {
          Due: {
            date: { start: '2024-03-15' },
          },
        },
      };

      const result = (connector as any).extractDueDate(page);
      expect(result).toBe('2024-03-15');
    });

    it('should return undefined when no due date', () => {
      const page = { properties: {} };
      const result = (connector as any).extractDueDate(page);
      expect(result).toBeUndefined();
    });
  });

  describe('extractLabels', () => {
    it('should extract labels from Tags multi_select', () => {
      const page = {
        properties: {
          Tags: {
            multi_select: [{ name: 'Frontend' }, { name: 'UI' }],
          },
        },
      };

      const result = (connector as any).extractLabels(page);
      expect(result).toEqual(['Frontend', 'UI']);
    });

    it('should return undefined when no tags', () => {
      const page = { properties: {} };
      const result = (connector as any).extractLabels(page);
      expect(result).toBeUndefined();
    });
  });

  describe('extractPriority', () => {
    it('should map emoji priority to internal format', () => {
      const page = {
        properties: {
          Priority: {
            select: { name: '🔴 Critical' },
          },
        },
      };

      const result = (connector as any).extractPriority(page);
      expect(result).toBe('critical');
    });

    it('should default to medium for unknown priority', () => {
      const page = {
        properties: {
          Priority: {
            select: { name: 'Unknown Priority' },
          },
        },
      };

      const result = (connector as any).extractPriority(page);
      expect(result).toBe('medium');
    });

    it('should return undefined when no priority', () => {
      const page = { properties: {} };
      const result = (connector as any).extractPriority(page);
      expect(result).toBeUndefined();
    });
  });

  describe('mapToTask', () => {
    it('should map Notion record to task fields', () => {
      const record = {
        id: 'notion-page-id',
        title: 'Mapped Task',
        description: 'Description',
        labels: ['Label1'],
        priority: 'high' as const,
        assignee: 'user@example.com',
        externalUrl: 'https://notion.co/page',
        parentPage: 'parent-db-id',
        properties: {},
        createdAt: new Date().toISOString(),
      };

      const result = connector.mapToTask(record);

      expect(result.title).toBe('Mapped Task');
      expect(result.description).toBe('Description');
      expect(result.labels).toEqual(['Label1']);
      expect(result.priority).toBe('high');
      expect(result.assignee).toBe('user@example.com');
    });
  });

  describe('extractDescription', () => {
    it('should extract description from rich_text property', () => {
      const page = {
        properties: {
          description: {
            rich_text: [
              { plain_text: 'This is a ' },
              { plain_text: 'description' },
            ],
          },
        },
      };

      const result = (connector as any).extractDescription(page);
      expect(result).toBe('This is a description');
    });

    it('should return undefined when no description property', () => {
      const page = { properties: {} };
      const result = (connector as any).extractDescription(page);
      expect(result).toBeUndefined();
    });

    it('should return empty string for empty rich_text array', () => {
      const page = {
        properties: {
          description: {
            rich_text: [],
          },
        },
      };
      const result = (connector as any).extractDescription(page);
      expect(result).toBe('');
    });
  });

  describe('extractAssignee', () => {
    it('should extract assignee email from people array', () => {
      const page = {
        properties: {
          Assignee: {
            people: [{ email: 'assignee@example.com', name: 'Assignee' }],
          },
        },
      };

      const result = (connector as any).extractAssignee(page);
      expect(result).toBe('assignee@example.com');
    });

    it('should fall back to name when email is not available', () => {
      const page = {
        properties: {
          Assignee: {
            people: [{ name: 'Assignee Name' }],
          },
        },
      };

      const result = (connector as any).extractAssignee(page);
      expect(result).toBe('Assignee Name');
    });

    it('should return undefined when no assignee property', () => {
      const page = { properties: {} };
      const result = (connector as any).extractAssignee(page);
      expect(result).toBeUndefined();
    });

    it('should return undefined when people array is empty', () => {
      const page = {
        properties: {
          Assignee: {
            people: [],
          },
        },
      };
      const result = (connector as any).extractAssignee(page);
      expect(result).toBeUndefined();
    });
  });
});
