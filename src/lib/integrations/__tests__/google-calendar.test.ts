import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getGoogleCalendarSync,
  enableGoogleCalendarSync,
  disableGoogleCalendarSync,
  syncTaskToCalendar,
  removeFromCalendar,
} from '../google-calendar';
import { setDb, resetDb, getDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';

// Mock fetch
global.fetch = vi.fn();

describe('Google Calendar Sync', () => {
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

  describe('getGoogleCalendarSync', () => {
    it('returns null when no sync config exists', () => {
      const result = getGoogleCalendarSync(1);
      expect(result).toBeNull();
    });

    it('returns sync config when it exists', () => {
      db.prepare(
        `
        INSERT INTO calendar_sync (user_id, provider, access_token, refresh_token, expires_at, enabled)
        VALUES (?, 'google', ?, ?, 9999999999, 1)
      `
      ).run(1, 'test-token', 'refresh-token');

      const result = getGoogleCalendarSync(1);

      expect(result).toBeDefined();
      expect(result?.user_id).toBe(1);
      expect(result?.provider).toBe('google');
      expect(result?.access_token).toBe('test-token');
    });
  });

  describe('enableGoogleCalendarSync', () => {
    it('enables sync for user', () => {
      enableGoogleCalendarSync(1, 'access-token', 'refresh-token', 9999999999);

      const result = getGoogleCalendarSync(1);
      expect(result?.access_token).toBe('access-token');
      expect(result?.refresh_token).toBe('refresh-token');
      expect(result?.enabled).toBe(1);
    });

    it('replaces existing sync config via INSERT OR REPLACE', () => {
      // Create initial with same user_id
      db.exec(`
        INSERT INTO calendar_sync (id, user_id, provider, access_token, enabled)
        VALUES (1, 1, 'google', 'old-token', 0)
      `);

      enableGoogleCalendarSync(1, 'new-token', 'new-refresh', 9999999999);

      const result = getGoogleCalendarSync(1);
      expect(result?.access_token).toBe('new-token');
      expect(result?.refresh_token).toBe('new-refresh');
      expect(result?.enabled).toBe(1);
    });
  });

  describe('disableGoogleCalendarSync', () => {
    it('disables sync for user', () => {
      db.exec(`
        INSERT INTO calendar_sync (id, user_id, provider, access_token, enabled)
        VALUES (1, 1, 'google', 'token', 1)
      `);

      disableGoogleCalendarSync(1);

      const result = getGoogleCalendarSync(1);
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
        expires_at: null,
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
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'event-123' }),
      });

      const result = await syncTaskToCalendar(task, sync);
      expect(result).toBe('event-123');
    });

    it('throws error when API fails', async () => {
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
        statusText: 'Forbidden',
      });

      await expect(syncTaskToCalendar(task, sync)).rejects.toThrow(
        'Failed to create calendar event'
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
});
