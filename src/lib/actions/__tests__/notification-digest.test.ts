import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  vi,
} from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/session', async () => {
  const actual = await vi.importActual<typeof import('@/lib/session')>(
    '@/lib/session'
  );
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: 1, name: 'Tester', email: 't@example.com' })),
  };
});

import { setDb, resetDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';
import { initializeSchema } from '@/lib/db/index';
import { migrations } from '@/lib/db/migrations';

beforeAll(() => {
  (process.env as Record<string, string>).NODE_ENV = 'test';
  (process.env as Record<string, string>).NEXTAUTH_SECRET = 'demo-secret';
});

describe('notification-digest actions', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);
    initializeSchema(db);
    try {
      for (const sql of Object.values(migrations)) {
        db.exec(sql);
      }
    } catch {
      /* ignore */
    }
    try {
      db.exec(
        `INSERT INTO users (id, name, email) VALUES (1, 'Tester', 't@example.com')`
      );
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    db.close();
  });

  describe('generateDailyDigest', () => {
    it('returns digest with expected fields', async () => {
      const { generateDailyDigest } = await import('@/lib/actions/notification-digest');
      const digest = await generateDailyDigest(1);
      expect(digest).toHaveProperty('overdue');
      expect(digest).toHaveProperty('due_today');
      expect(digest).toHaveProperty('upcoming');
      expect(digest).toHaveProperty('completed_today');
      expect(digest).toHaveProperty('streak');
      expect(Array.isArray(digest.overdue)).toBe(true);
      expect(Array.isArray(digest.due_today)).toBe(true);
      expect(Array.isArray(digest.upcoming)).toBe(true);
    });

    it('returns empty overdue list for user with no tasks', async () => {
      const { generateDailyDigest } = await import('@/lib/actions/notification-digest');
      const digest = await generateDailyDigest(1);
      expect(digest.overdue.length).toBe(0);
      expect(digest.due_today.length).toBe(0);
    });
  });

  describe('sendNotificationDigest', () => {
    it('returns boolean', async () => {
      const { generateDailyDigest, sendNotificationDigest } = await import(
        '@/lib/actions/notification-digest'
      );
      const digest = await generateDailyDigest(1);
      const result = await sendNotificationDigest(1, digest);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('returns preferences object', async () => {
      const { getUserNotificationPreferences } = await import(
        '@/lib/actions/notification-digest'
      );
      const prefs = await getUserNotificationPreferences(1);
      expect(prefs).toHaveProperty('email_enabled');
      expect(prefs).toHaveProperty('push_enabled');
      expect(prefs).toHaveProperty('daily_digest');
    });

    it('returns defaults for new user', async () => {
      const { getUserNotificationPreferences } = await import(
        '@/lib/actions/notification-digest'
      );
      const prefs = await getUserNotificationPreferences(9999);
      expect(prefs).toHaveProperty('email_enabled');
    });
  });

  describe('updateUserNotificationPreferences', () => {
    it('returns boolean', async () => {
      const { updateUserNotificationPreferences } = await import(
        '@/lib/actions/notification-digest'
      );
      const result = await updateUserNotificationPreferences(1, {
        email_enabled: true,
        push_enabled: false,
      });
      expect(typeof result).toBe('boolean');
    });
  });

  describe('generateWeeklySummary', () => {
    it('returns weekly summary for new user', async () => {
      const { generateWeeklySummary } = await import('@/lib/actions/notification-digest');
      const summary = await generateWeeklySummary(1);
      expect(summary).toBeDefined();
      // New users may have undefined or 0 stats
    });
  });

  describe('ensureNotificationTables', () => {
    it('runs without throwing', async () => {
      const { ensureNotificationTables } = await import('@/lib/actions/notification-digest');
      await expect(ensureNotificationTables()).resolves.not.toThrow();
    });
  });
});
