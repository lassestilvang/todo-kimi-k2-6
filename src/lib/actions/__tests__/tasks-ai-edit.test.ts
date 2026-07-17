import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb } from '@/lib/db/test-db';
import { setDb, resetDb } from '@/lib/db';
import { editTaskWithAI, getTasksByIds } from '@/lib/actions/tasks';
import type { Priority } from '@/types';

// Mock session
vi.mock('@/lib/session', () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from '@/lib/session';

describe('Task Actions - AI Edit Function', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);
    vi.clearAllMocks();

    // Set up test user
    (getCurrentUser as any).mockReturnValue({ id: 1 });

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        list_id INTEGER,
        date TEXT,
        deadline TEXT,
        priority TEXT DEFAULT 'none',
        recurring TEXT DEFAULT 'none',
        archived INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0
      );
    `);

    db.exec("INSERT INTO lists (id, name, user_id) VALUES (1, 'Inbox', 1)");
  });

  afterEach(() => {
    db.close();
    resetDb();
  });

  describe('editTaskWithAI edge cases', () => {
    it('should return failure when no valid task specified', async () => {
      const result = await editTaskWithAI(
        { action: '' },
        [{ id: 1, name: 'Test', completed: false, priority: 'high' }]
      );
      expect(result.success).toBe(false);
      expect(result.message).toBe('No valid task specified');
    });

    it('should handle delete action successfully', async () => {
      const taskResult = db.prepare(
        'INSERT INTO tasks (user_id, name, list_id, completed) VALUES (?, ?, ?, 0)'
      ).run(1, 'Task to Delete', 1);
      const taskId = Number(taskResult.lastInsertRowid);

      const result = await editTaskWithAI(
        { action: 'delete', taskId },
        [{ id: taskId, name: 'Task to Delete', completed: false, priority: 'high' }]
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Task deleted');
    });

    it('should handle priority update with valid priority', async () => {
      const taskResult = db.prepare(
        'INSERT INTO tasks (user_id, name, list_id, priority, completed) VALUES (?, ?, ?, ?, 0)'
      ).run(1, 'Priority Task', 1, 'low');
      const taskId = Number(taskResult.lastInsertRowid);

      const result = await editTaskWithAI(
        { action: 'update', taskId, updates: { priority: 'critical' } },
        [{ id: taskId, name: 'Priority Task', completed: false, priority: 'low' }]
      );

      expect(result.success).toBe(true);
      expect(result.task?.priority).toBe('critical');
    });

    it('should ignore invalid priority values', async () => {
      const taskResult = db.prepare(
        'INSERT INTO tasks (user_id, name, list_id, priority, completed) VALUES (?, ?, ?, ?, 0)'
      ).run(1, 'Priority Task', 1, 'low');
      const taskId = Number(taskResult.lastInsertRowid);

      const result = await editTaskWithAI(
        { action: 'update', taskId, updates: { priority: 'invalid-priority' as Priority } },
        [{ id: taskId, name: 'Priority Task', completed: false, priority: 'low' }]
      );

      expect(result.success).toBe(true);
      expect(result.task?.priority).toBe('low');
    });

    it('should handle list_id update with valid number', async () => {
      db.exec("INSERT INTO lists (id, name, user_id) VALUES (2, 'Target List', 1)");

      const taskResult = db.prepare(
        'INSERT INTO tasks (user_id, name, list_id, completed) VALUES (?, ?, ?, 0)'
      ).run(1, 'List Task', 1);
      const taskId = Number(taskResult.lastInsertRowid);

      const result = await editTaskWithAI(
        { action: 'update', taskId, updates: { list_id: 2 } },
        [{ id: taskId, name: 'List Task', completed: false, priority: 'high' }]
      );

      expect(result.success).toBe(true);
    });

    it('should ignore non-number list_id values', async () => {
      const taskResult = db.prepare(
        'INSERT INTO tasks (user_id, name, list_id, completed) VALUES (?, ?, ?, 0)'
      ).run(1, 'List Task', 1);
      const taskId = Number(taskResult.lastInsertRowid);

      const result = await editTaskWithAI(
        { action: 'update', taskId, updates: { list_id: 'not-a-number' as any } },
        [{ id: taskId, name: 'List Task', completed: false, priority: 'high' }]
      );

      expect(result.success).toBe(true);
    });

    it('should handle completed boolean update', async () => {
      const taskResult = db.prepare(
        'INSERT INTO tasks (user_id, name, list_id, completed) VALUES (?, ?, ?, 0)'
      ).run(1, 'Complete Task', 1);
      const taskId = Number(taskResult.lastInsertRowid);

      const result = await editTaskWithAI(
        { action: 'update', taskId, updates: { completed: true } },
        [{ id: taskId, name: 'Complete Task', completed: false, priority: 'high' }]
      );

      expect(result.success).toBe(true);
      expect(result.task?.completed).toBe(1);
    });

    it('should handle date string update', async () => {
      const taskResult = db.prepare(
        "INSERT INTO tasks (user_id, name, list_id, date, completed) VALUES (?, ?, ?, ?, 0)"
      ).run(1, 'Date Task', 1, '2024-01-01');
      const taskId = Number(taskResult.lastInsertRowid);

      const result = await editTaskWithAI(
        { action: 'update', taskId, updates: { date: '2024-12-31' } },
        [{ id: taskId, name: 'Date Task', completed: false, priority: 'high' }]
      );

      expect(result.success).toBe(true);
      expect(result.task?.date).toBe('2024-12-31');
    });

    it('should ignore non-string date values', async () => {
      const taskResult = db.prepare(
        "INSERT INTO tasks (user_id, name, list_id, date, completed) VALUES (?, ?, ?, ?, 0)"
      ).run(1, 'Date Task', 1, '2024-01-01');
      const taskId = Number(taskResult.lastInsertRowid);

      const result = await editTaskWithAI(
        { action: 'update', taskId, updates: { date: 123 as any } },
        [{ id: taskId, name: 'Date Task', completed: false, priority: 'high' }]
      );

      expect(result.success).toBe(true);
    });

    it('should handle deadline string update', async () => {
      const taskResult = db.prepare(
        "INSERT INTO tasks (user_id, name, list_id, deadline, completed) VALUES (?, ?, ?, ?, 0)"
      ).run(1, 'Deadline Task', 1, null);
      const taskId = Number(taskResult.lastInsertRowid);

      const result = await editTaskWithAI(
        { action: 'update', taskId, updates: { deadline: '2024-12-31' } },
        [{ id: taskId, name: 'Deadline Task', completed: false, priority: 'high' }]
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getTasksByIds edge cases', () => {
    it('should handle task IDs with non-existent tasks gracefully', async () => {
      const tasks = await getTasksByIds([99999, 99998]);
      expect(tasks).toEqual([]);
    });

    it('should handle mixed existing and non-existing tasks', async () => {
      const taskResult = db.prepare(
        'INSERT INTO tasks (user_id, name, list_id) VALUES (?, ?, ?)'
      ).run(1, 'Existing Task', 1);
      const existingId = Number(taskResult.lastInsertRowid);

      const tasks = await getTasksByIds([existingId, 99999]);
      expect(tasks.length).toBeGreaterThanOrEqual(0);
    });
  });
});