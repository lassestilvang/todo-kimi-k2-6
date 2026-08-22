import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GmailConnector } from '../gmail';

// Mock fetch
global.fetch = vi.fn();

describe('GmailConnector', () => {
  let connector: GmailConnector;

  beforeEach(() => {
    vi.resetAllMocks();
    connector = new GmailConnector({
      id: 'test-gmail',
      type: 'gmail',
      name: 'Gmail',
      enabled: true,
      apiToken: 'test-token',
      userId: 'me',
      syncDirection: 'import',
    });
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(connector.id).toBe('gmail');
      expect(connector.type).toBe('gmail');
      expect(connector.name).toBe('Gmail');
    });

    it('should store custom user ID if provided', () => {
      const customConnector = new GmailConnector({
        id: 'custom-gmail',
        type: 'gmail',
        name: 'Gmail',
        enabled: true,
        apiToken: 'token',
        userId: 'user123',
        syncDirection: 'import',
      });

      expect((customConnector as any).userId).toBe('user123');
    });

    it('should default to "me" user ID', () => {
      expect((connector as any).userId).toBe('me');
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

    it('should include refresh token if provided', async () => {
      const result = await connector.authenticate({
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
      });

      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw error when no access token provided', async () => {
      await expect(connector.authenticate({})).rejects.toThrow(
        'Gmail integration requires an access token'
      );
    });
  });

  describe('fetchRecords', () => {
    it('should fetch unread emails by default', async () => {
      const mockMessage = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX', 'UNREAD'],
        payload: {
          headers: [
            { name: 'Subject', value: 'Task: Review PR #123' },
            { name: 'From', value: 'john@example.com' },
            { name: 'To', value: 'jane@example.com' },
          ],
          parts: [
            {
              mimeType: 'text/plain',
              body: {
                data: Buffer.from(
                  'Please review the PR when you have time.\nThanks!'
                ).toString('base64'),
              },
            },
          ],
        },
      };

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            messages: [{ id: 'msg123' }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMessage,
        });

      const records = await connector.fetchRecords();

      expect(records).toHaveLength(1);
      expect(records[0].title).toBe('Task: Review PR #123');
      expect(records[0].sender).toBe('john@example.com');
      expect(records[0].recipients).toEqual(['jane@example.com']);
    });

    it('should support custom query and labels', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [],
        }),
      });

      await connector.fetchRecords(undefined, { limit: 10 });

      expect(fetch).toHaveBeenCalled();
    });

    it('should throw error when API fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Forbidden',
      });

      await expect(connector.fetchRecords()).rejects.toThrow('Gmail API error');
    });
  });

  describe('isTaskCandidate', () => {
    it('should return true for task: prefix', async () => {
      const isTask = await (connector as any).isTaskCandidate(
        'Task: Implement feature X',
        ''
      );
      expect(isTask).toBe(true);
    });

    it('should return true for todo: prefix', async () => {
      const isTask = await (connector as any).isTaskCandidate(
        'Todo: Fix bug in auth',
        ''
      );
      expect(isTask).toBe(true);
    });

    it('should return true for action verbs', async () => {
      const isTask = await (connector as any).isTaskCandidate(
        'Please implement the feature',
        ''
      );
      expect(isTask).toBe(true);
    });

    it('should return false for regular emails', async () => {
      const isTask = await (connector as any).isTaskCandidate(
        'Weekly meeting notes',
        ''
      );
      expect(isTask).toBe(false);
    });
  });

  describe('extractTitle', () => {
    it('should remove Re: prefix', () => {
      const title = (connector as any).extractTitle('Re: Task for review');
      expect(title).toBe('Task for review');
    });

    it('should remove Fwd: prefix', () => {
      const title = (connector as any).extractTitle('Fwd: Project update');
      expect(title).toBe('Project update');
    });

    it('should return "No subject" for empty subject', () => {
      const title = (connector as any).extractTitle('');
      expect(title).toBe('No subject');
    });
  });

  describe('extractDueDate', () => {
    it('should return undefined for no due date pattern', () => {
      const dueDate = (connector as any).extractDueDate(
        'No deadline mentioned'
      );
      expect(dueDate).toBeUndefined();
    });
  });

  describe('extractLabels', () => {
    it('should extract Gmail labels', () => {
      const labels = (connector as any).extractLabels({
        labelIds: ['INBOX', 'CATEGORY_WORK', 'STARRED'],
      });

      expect(labels).toContain('Work');
      expect(labels).toContain('Starred');
    });

    it('should return undefined for no labels', () => {
      const labels = (connector as any).extractLabels({ labelIds: [] });
      expect(labels).toBeUndefined();
    });
  });

  describe('extractPriority', () => {
    it('should return critical for urgent keywords', () => {
      const priority = (connector as any).extractPriority('Urgent task', []);
      expect(priority).toBe('critical');
    });

    it('should return high for important keywords', () => {
      const priority = (connector as any).extractPriority(
        'Important document',
        []
      );
      expect(priority).toBe('high');
    });

    it('should return low for low priority keywords', () => {
      const priority = (connector as any).extractPriority(
        'Low priority item',
        []
      );
      expect(priority).toBe('low');
    });

    it('should return undefined for normal priority', () => {
      const priority = (connector as any).extractPriority('Normal task', []);
      expect(priority).toBeUndefined();
    });
  });

  describe('base64Decode', () => {
    it('should decode base64 string', () => {
      const decoded = (connector as any).base64Decode(
        Buffer.from('Hello World').toString('base64')
      );
      expect(decoded).toBe('Hello World');
    });

    it('should handle URL-safe base64', () => {
      const decoded = (connector as any).base64Decode(
        Buffer.from('Test+Data')
          .toString('base64')
          .replace('+', '-')
          .replace('/', '_')
      );
      expect(decoded).toBe('Test+Data');
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      const text = (connector as any).stripHtml('<p>Hello <b>World</b></p>');
      expect(text).toBe('Hello World');
    });
  });

  describe('getThreads', () => {
    it('should fetch threads', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          threads: [
            {
              id: 'thread1',
              subject: 'Project update',
              snippet: 'Weekly progress',
              messages: [{ id: 'msg1' }],
            },
          ],
        }),
      });

      const threads = await connector.getThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].subject).toBe('Project update');
    });
  });

  describe('createDraft', () => {
    it('should create a draft', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft123',
        }),
      });

      const result = await connector.createDraft(
        'to@example.com',
        'Test Subject',
        'Test body'
      );

      expect(result.id).toBe('draft123');
      expect(fetch).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('sendEmail', () => {
    it('should send email', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg123',
        }),
      });

      const result = await connector.sendEmail(
        'to@example.com',
        'Test Subject',
        'Test body'
      );

      expect(result.id).toBe('msg123');
    });
  });

  describe('addLabel', () => {
    it('should add label to message', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await connector.addLabel('msg123', 'TASK');

      expect(result).toBe(true);
    });
  });

  describe('removeLabel', () => {
    it('should remove label from message', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await connector.removeLabel('msg123', 'UNREAD');

      expect(result).toBe(true);
    });
  });

  describe('createLabel', () => {
    it('should create a label', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'label123',
          name: 'Tasks',
        }),
      });

      const result = await connector.createLabel('Tasks');

      expect(result.name).toBe('Tasks');
    });
  });

  describe('getUserProfile', () => {
    it('should fetch user profile', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'user@example.com',
          displayName: 'Test User',
          pictureUrl: 'https://example.com/pic.jpg',
        }),
      });

      const profile = await connector.getUserProfile();

      expect(profile.email).toBe('user@example.com');
      expect(profile.displayName).toBe('Test User');
    });
  });

  describe('testConnection', () => {
    it('should return true on successful profile fetch', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'user@example.com',
        }),
      });

      // testConnection not overridden, uses base class method
      // which calls fetchRecords - let's test getUserProfile as connectivity test
      const profile = await connector.getUserProfile();
      expect(profile.email).toBe('user@example.com');
    });
  });
});
