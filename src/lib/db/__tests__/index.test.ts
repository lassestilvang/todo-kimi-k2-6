import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../index';

describe('Database', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('getDb', () => {
    it('returns a database instance', () => {
      const db = getDb();
      expect(db).toBeDefined();
    });

    it('returns the same instance on subsequent calls', () => {
      const db1 = getDb();
      const db2 = getDb();
      expect(db1).toBe(db2);
    });
  });

  describe('schema', () => {
    it('creates required tables', () => {
      const db = getDb();

      // Check tasks table exists
      const tasksTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").get() as { name: string } | undefined;
      expect(tasksTable).toBeDefined();
      expect(tasksTable?.name).toBe('tasks');

      // Check lists table exists
      const listsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='lists'").get() as { name: string } | undefined;
      expect(listsTable).toBeDefined();
      expect(listsTable?.name).toBe('lists');

      // Check labels table exists
      const labelsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='labels'").get() as { name: string } | undefined;
      expect(labelsTable).toBeDefined();
      expect(labelsTable?.name).toBe('labels');
    });

    it('creates default inbox list', () => {
      const db = getDb();
      const inbox = db.prepare("SELECT * FROM lists WHERE is_inbox = 1").get() as { name: string } | undefined;
      expect(inbox).toBeDefined();
      expect(inbox?.name).toBe('Inbox');
    });
  });
});