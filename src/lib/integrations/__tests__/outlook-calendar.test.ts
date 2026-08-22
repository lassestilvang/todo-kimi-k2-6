import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOutlookCalendarSync,
  enableOutlookCalendarSync,
  disableOutlookCalendarSync,
  syncTaskToCalendar,
  removeFromCalendar,
  getOutlookAuthUrl,
  exchangeOutlookCodeForTokens,
} from '../outlook-calendar';
import { setDb, resetDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';

// Mock fetch
global.fetch = vi.fn();

describe('Outlook Calendar Sync', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT, name TEXT, created_at TEXT)
    `);

    // Create calendar_sync table
    db.exec(`
      CREATE TABLE IF NOT EXISTS calendar_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        expires_at INTEGER,
        enabled INTEGER DEFAULT 0,
        tenant_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tasks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        description TEXT,
        deadline TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT,
        sort_order INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0
      )
    `);

    // Insert test user
    db.exec(`
      INSERT INTO users (id, email, name, created_at) VALUES (1, 'test@example.com', 'Test User', datetime('now'))
    `);

    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
    resetDb();
  });

  describe('getOutlookCalendarSync', () => {
    it('returns null when no sync config exists', () => {
      const result = getOutlookCalendarSync(1);
      expect(result).toBeNull();
    });

    it('returns sync config when it exists', () => {
      db.prepare(
        `
        INSERT INTO calendar_sync (user_id, provider, access_token, refresh_token, expires_at, enabled, tenant_id)
        VALUES (?, 'outlook', ?, ?, 9999999999, 1, 'tenant-123')
      `
      ).run(1, 'test-token', 'refresh-token');

      const result = getOutlookCalendarSync(1);

      expect(result).toBeDefined();
      expect(result?.user_id).toBe(1);
      expect(result?.provider).toBe('outlook');
      expect(result?.access_token).toBe('test-token');
      expect(result?.tenant_id).toBe('tenant-123');
    });
  });

  describe('enableOutlookCalendarSync', () => {
    it('enables sync for user', () => {
      enableOutlookCalendarSync(1, 'access-token', 'refresh-token', 9999999999);

      const result = getOutlookCalendarSync(1);
      expect(result?.access_token).toBe('access-token');
      expect(result?.refresh_token).toBe('refresh-token');
      expect(result?.enabled).toBe(1);
    });

    it('includes tenant_id when provided', () => {
      enableOutlookCalendarSync(
        1,
        'access-token',
        'refresh-token',
        9999999999,
        'tenant-456'
      );

      const result = getOutlookCalendarSync(1);
      expect(result?.tenant_id).toBe('tenant-456');
    });

    it('sets null tenant_id when not provided', () => {
      enableOutlookCalendarSync(1, 'access-token', 'refresh-token', 9999999999);

      const result = getOutlookCalendarSync(1);
      expect(result?.tenant_id).toBeNull();
    });

    it('replaces existing sync config via INSERT OR REPLACE', () => {
      // Create initial with same user_id
      db.exec(`
        INSERT INTO calendar_sync (id, user_id, provider, access_token, enabled)
        VALUES (1, 1, 'outlook', 'old-token', 0)
      `);

      enableOutlookCalendarSync(1, 'new-token', 'new-refresh', 9999999999);

      const result = getOutlookCalendarSync(1);
      expect(result?.access_token).toBe('new-token');
      expect(result?.enabled).toBe(1);
    });
  });

  describe('disableOutlookCalendarSync', () => {
    it('disables sync for user', () => {
      db.exec(`
        INSERT INTO calendar_sync (id, user_id, provider, access_token, enabled)
        VALUES (1, 1, 'outlook', 'token', 1)
      `);

      disableOutlookCalendarSync(1);

      const result = getOutlookCalendarSync(1);
      expect(result?.enabled).toBe(0);
    });
  });

  describe('syncTaskToCalendar', () => {
    it('returns null when task has no deadline', async () => {
      const sync: any = {
        id: 1,
        user_id: 1,
        access_token: 'test-token',
        refresh_token: null,
        expires_at: Date.now() + 3600000,
        enabled: true,
      };

      const task: any = {
        id: 1,
        name: 'No deadline task',
        description: 'This has no deadline',
        deadline: null,
      };

      const result = await syncTaskToCalendar(task, sync);
      expect(result).toBeNull();
    });

    it('syncs task with deadline to calendar', async () => {
      const sync: any = {
        id: 1,
        user_id: 1,
        access_token: 'test-token',
        refresh_token: null,
        expires_at: Date.now() + 3600000,
        enabled: true,
      };

      const task: any = {
        id: 1,
        name: 'Task with deadline',
        description: 'Important task',
        deadline: '2026-12-31T10:00:00Z',
        priority: 'high',
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'event-123' }),
      });

      const result = await syncTaskToCalendar(task, sync);
      expect(result).toBe('event-123');

      // Verify the request body
      const callArgs = (fetch as any).mock.calls[0][1];
      expect(callArgs.method).toBe('POST');
      expect(callArgs.headers.Authorization).toBe('Bearer test-token');

      const body = JSON.parse(callArgs.body);
      expect(body.subject).toBe('Task with deadline');
      expect(body.categories).toContain('HIGH');
    });

    it('throws error when API fails', async () => {
      const sync: any = {
        id: 1,
        user_id: 1,
        access_token: 'test-token',
        refresh_token: null,
        expires_at: Date.now() + 3600000,
        enabled: 1,
      };

      const task: any = {
        id: 1,
        name: 'Task with deadline',
        description: 'Important task',
        deadline: '2026-12-31T10:00:00Z',
      };

      (fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Forbidden',
        json: async () => ({}),
      });

      await expect(syncTaskToCalendar(task, sync)).rejects.toThrow(
        'Failed to create Outlook event'
      );
    });

    it('handles error response with error message', async () => {
      const sync: any = {
        id: 1,
        user_id: 1,
        access_token: 'test-token',
        refresh_token: null,
        expires_at: Date.now() + 3600000,
        enabled: true,
      };

      const task: any = {
        id: 1,
        name: 'Task with deadline',
        description: 'Important task',
        deadline: '2026-12-31T10:00:00Z',
      };

      (fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: { message: 'Invalid request' } }),
      });

      await expect(syncTaskToCalendar(task, sync)).rejects.toThrow(
        'Failed to create Outlook event: Invalid request'
      );
    });
  });

  describe('removeFromCalendar', () => {
    it('removes event from calendar', async () => {
      const sync: any = {
        id: 1,
        user_id: 1,
        access_token: 'test-token',
        refresh_token: null,
        expires_at: Date.now() + 3600000,
        enabled: true,
      };

      await removeFromCalendar('event-123', sync);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('event-123'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('returns early when access token is null', async () => {
      const sync: any = {
        id: 1,
        user_id: 1,
        access_token: null,
        refresh_token: null,
        expires_at: Date.now() + 3600000,
        enabled: true,
      };

      await removeFromCalendar('event-123', sync);

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('getOutlookAuthUrl', () => {
    it('generates authorization URL with correct parameters', () => {
      const originalClientId = process.env.OUTLOOK_CLIENT_ID;
      const originalNextauthUrl = process.env.NEXTAUTH_URL;
      process.env.OUTLOOK_CLIENT_ID = 'test-client-id';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      const url = getOutlookAuthUrl('test-state');

      expect(url).toContain('login.microsoftonline.com');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=test-state');
      expect(url).toContain('code');
      expect(url).toContain('Calendars.ReadWrite');

      process.env.OUTLOOK_CLIENT_ID = originalClientId;
      process.env.NEXTAUTH_URL = originalNextauthUrl;
    });

    it('handles missing OUTLOOK_CLIENT_ID', () => {
      const originalClientId = process.env.OUTLOOK_CLIENT_ID;
      delete process.env.OUTLOOK_CLIENT_ID;
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      const url = getOutlookAuthUrl('test-state');

      expect(url).toContain('login.microsoftonline.com');

      process.env.OUTLOOK_CLIENT_ID = originalClientId;
    });
  });

  describe('exchangeOutlookCodeForTokens', () => {
    it('exchanges code for tokens', async () => {
      const originalClientId = process.env.OUTLOOK_CLIENT_ID;
      const originalClientSecret = process.env.OUTLOOK_CLIENT_SECRET;
      const originalNextauthUrl = process.env.NEXTAUTH_URL;

      process.env.OUTLOOK_CLIENT_ID = 'test-client-id';
      process.env.OUTLOOK_CLIENT_SECRET = 'test-client-secret';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        }),
      });

      const tokens = await exchangeOutlookCodeForTokens('auth-code');

      expect(tokens.access_token).toBe('new-access-token');
      expect(tokens.refresh_token).toBe('new-refresh-token');
      expect(tokens.expires_in).toBe(3600);

      process.env.OUTLOOK_CLIENT_ID = originalClientId;
      process.env.OUTLOOK_CLIENT_SECRET = originalClientSecret;
      process.env.NEXTAUTH_URL = originalNextauthUrl;
    });

    it('throws error when exchange fails', async () => {
      const originalClientId = process.env.OUTLOOK_CLIENT_ID;
      const originalClientSecret = process.env.OUTLOOK_CLIENT_SECRET;

      process.env.OUTLOOK_CLIENT_ID = 'test-client-id';
      process.env.OUTLOOK_CLIENT_SECRET = 'test-client-secret';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      (fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error_description: 'Invalid code' }),
      });

      await expect(
        exchangeOutlookCodeForTokens('invalid-code')
      ).rejects.toThrow('Token exchange failed');

      process.env.OUTLOOK_CLIENT_ID = originalClientId;
      process.env.OUTLOOK_CLIENT_SECRET = originalClientSecret;
    });

    it('throws error with statusText when no error description', async () => {
      const originalClientId = process.env.OUTLOOK_CLIENT_ID;
      const originalClientSecret = process.env.OUTLOOK_CLIENT_SECRET;

      process.env.OUTLOOK_CLIENT_ID = 'test-client-id';
      process.env.OUTLOOK_CLIENT_SECRET = 'test-client-secret';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      (fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({}),
      });

      await expect(exchangeOutlookCodeForTokens('bad-code')).rejects.toThrow(
        'Token exchange failed'
      );

      process.env.OUTLOOK_CLIENT_ID = originalClientId;
      process.env.OUTLOOK_CLIENT_SECRET = originalClientSecret;
    });
  });

  describe('getOutlookUserProfile', () => {
    it('gets user profile', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user-123',
          displayName: 'Test User',
          mail: 'test@example.com',
        }),
      });

      const profile = await import('../outlook-calendar').then(m =>
        m.getOutlookUserProfile('test-token')
      );

      expect(profile.id).toBe('user-123');
      expect(profile.displayName).toBe('Test User');
      expect(profile.email).toBe('test@example.com');
    });

    it('throws error when API fails', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
      });

      const { getOutlookUserProfile } = await import('../outlook-calendar');
      await expect(getOutlookUserProfile('invalid-token')).rejects.toThrow(
        'Failed to fetch Outlook profile'
      );
    });
  });
});
