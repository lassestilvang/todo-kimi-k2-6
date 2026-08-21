import { describe, it, expect, beforeEach } from 'vitest';
import { getTaskRelations } from '../relations';
import { setDb, resetDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';

describe('getTaskRelations', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '🏷️',
        color TEXT DEFAULT '#8b5cf6',
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS task_labels (
        task_id INTEGER,
        label_id INTEGER
      );
      CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        name TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        remind_at TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS task_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        action TEXT,
        details TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS task_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        content TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        depends_on_task_id INTEGER,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id INTEGER,
        completed INTEGER DEFAULT 0,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        name TEXT,
        avatar_url TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS task_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        user_id INTEGER,
        permission TEXT,
        share_token TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS task_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        filename TEXT,
        file_size INTEGER,
        mime_type TEXT,
        url TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        start_time TEXT,
        end_time TEXT,
        duration_seconds INTEGER,
        description TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS recurring_exceptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        exception_date TEXT,
        created_at TEXT
      );
    `);
  });

  describe('Empty Input Handling', () => {
    it('should return empty object for empty task IDs array', async () => {
      const result = await getTaskRelations(db, []);
      expect(result).toEqual({});
    });
  });

  describe('Subtasks', () => {
    it('should fetch subtasks for tasks', async () => {
      db.exec(`
        INSERT INTO subtasks (id, task_id, name, completed, created_at) VALUES
        (1, 1, 'Subtask 1', 0, '2024-01-01');
      `);

      const result = await getTaskRelations(db, [1]);

      expect(result[1]?.subtasks).toHaveLength(1);
      expect(result[1]?.subtasks[0].name).toBe('Subtask 1');
    });

    it('should return empty array for task with no subtasks', async () => {
      const result = await getTaskRelations(db, [999]);
      expect(result[999]?.subtasks).toEqual([]);
    });
  });

  describe('Reminders', () => {
    it('should fetch reminders for tasks', async () => {
      db.exec(`
        INSERT INTO reminders (id, task_id, remind_at, created_at) VALUES
        (1, 1, '2024-07-15T10:00:00Z', '2024-01-01');
      `);

      const result = await getTaskRelations(db, [1]);

      expect(result[1]?.reminders).toHaveLength(1);
    });

    it('should return empty array for task with no reminders', async () => {
      const result = await getTaskRelations(db, [999]);
      expect(result[999]?.reminders).toEqual([]);
    });
  });

  describe('Task Logs', () => {
    it('should fetch task logs for tasks', async () => {
      db.exec(`
        INSERT INTO task_logs (id, task_id, action, details, created_at) VALUES
        (1, 1, 'created', 'Task created', '2024-01-01');
      `);

      const result = await getTaskRelations(db, [1]);

      expect(result[1]?.logs).toHaveLength(1);
      expect(result[1]?.logs[0].action).toBe('created');
    });

    it('should return empty array for task with no logs', async () => {
      const result = await getTaskRelations(db, [999]);
      expect(result[999]?.logs).toEqual([]);
    });
  });

  describe('Comments', () => {
    it('should fetch comments for tasks', async () => {
      db.exec(`
        INSERT INTO task_comments (id, task_id, content, created_at) VALUES
        (1, 1, 'Comment 1', '2024-01-01');
      `);

      const result = await getTaskRelations(db, [1]);

      expect(result[1]?.comments).toHaveLength(1);
      expect(result[1]?.comments[0].content).toBe('Comment 1');
    });

    it('should return empty array for task with no comments', async () => {
      const result = await getTaskRelations(db, [999]);
      expect(result[999]?.comments).toEqual([]);
    });
  });

  describe('Task Dependencies', () => {
    it('should return empty arrays for task with no dependencies', async () => {
      const result = await getTaskRelations(db, [1]);
      expect(result[1]?.blockers).toEqual([]);
      expect(result[1]?.blocked_by).toEqual([]);
    });
  });

  describe('Assignees', () => {
    it('should return undefined for task with no assignees', async () => {
      const result = await getTaskRelations(db, [1]);
      expect(result[1]?.assignee).toBeUndefined();
    });
  });

  describe('Attachments', () => {
    it('should fetch attachments for tasks', async () => {
      db.exec(`
        INSERT INTO task_attachments (id, task_id, filename, file_size, mime_type, url, created_at) VALUES
        (1, 1, 'file1.pdf', 1024, 'application/pdf', 'http://example.com/file1.pdf', '2024-01-01');
      `);

      const result = await getTaskRelations(db, [1]);

      expect(result[1]?.attachments).toHaveLength(1);
      expect(result[1]?.attachments[0].filename).toBe('file1.pdf');
    });

    it('should return empty array for task with no attachments', async () => {
      const result = await getTaskRelations(db, [999]);
      expect(result[999]?.attachments).toEqual([]);
    });
  });

  describe('Time Entries', () => {
    it('should fetch time entries for tasks', async () => {
      db.exec(`
        INSERT INTO time_entries (id, task_id, start_time, end_time, duration_seconds, created_at) VALUES
        (1, 1, '2024-07-15T09:00:00Z', '2024-07-15T10:00:00Z', 3600, '2024-01-01');
      `);

      const result = await getTaskRelations(db, [1]);

      expect(result[1]?.time_entries).toHaveLength(1);
    });

    it('should return empty array for task with no time entries', async () => {
      const result = await getTaskRelations(db, [999]);
      expect(result[999]?.time_entries).toEqual([]);
    });
  });

  describe('Recurring Exceptions', () => {
    it('should fetch recurring exceptions for tasks', async () => {
      db.exec(`
        INSERT INTO recurring_exceptions (id, task_id, exception_date, created_at) VALUES
        (1, 1, '2024-07-15', '2024-01-01');
      `);

      const result = await getTaskRelations(db, [1]);

      expect(result[1]?.recurring_exceptions).toHaveLength(1);
    });

    it('should return empty array for task with no exceptions', async () => {
      const result = await getTaskRelations(db, [999]);
      expect(result[999]?.recurring_exceptions).toEqual([]);
    });
  });

  describe('Null Safety', () => {
    it('should handle non-existent task IDs gracefully', async () => {
      const result = await getTaskRelations(db, [999]);

      expect(result[999]).toBeDefined();
      expect(result[999]?.labels).toEqual([]);
      expect(result[999]?.subtasks).toEqual([]);
      expect(result[999]?.reminders).toEqual([]);
      expect(result[999]?.logs).toEqual([]);
      expect(result[999]?.comments).toEqual([]);
      expect(result[999]?.blockers).toEqual([]);
      expect(result[999]?.blocked_by).toEqual([]);
      expect(result[999]?.time_entries).toEqual([]);
      expect(result[999]?.recurring_exceptions).toEqual([]);
    });
  });
});
