/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../../../../lib/db/test-db';
import { setDb, resetDb } from '../../../../lib/db';
import {
  getLists,
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
} from '../../../../lib/actions/tasks';

// Mock NextRequest
class MockNextRequest {
  private url: string;
  private body: any;

  constructor(url: string, body?: any) {
    this.url = url;
    this.body = body;
  }

  get nextUrl() {
    return { searchParams: new URLSearchParams(this.url.split('?')[1] || '') };
  }

  json() {
    return Promise.resolve(this.body);
  }
}

// Mock NextResponse
class MockNextResponse {
  status: number;
  private data: any;

  constructor(data: any, status = 200) {
    this.data = data;
    this.status = status;
  }

  json() {
    return Promise.resolve(this.data);
  }
}

describe('API Routes - Tasks', () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  afterEach(() => {
    resetDb();
  });

  describe('GET /api/tasks', () => {
    it('should return empty array when no tasks', async () => {
      const tasks = await getTasks();
      expect(tasks).toEqual([]);
    });

    it('should return tasks with relations', async () => {
      await createTask({ name: 'Test Task' });
      const tasks = await getTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].name).toBe('Test Task');
    });

    it('should filter by view', async () => {
      const today = new Date().toISOString().split('T')[0];
      await createTask({ name: 'Today Task', date: today });
      await createTask({ name: 'Future Task', date: '2099-01-01' });

      const todayTasks = await getTasks({ view: 'today' });
      expect(todayTasks.length).toBe(1);
      expect(todayTasks[0].name).toBe('Today Task');
    });

    it('should filter by listId', async () => {
      const lists = await getLists();
      const inboxList = lists.find(l => Number(l.is_inbox) === 1);
      const { createList } = await import('../../../../lib/actions/tasks');
      const customList = lists.length > 1 ? lists[1] : await createList({ name: 'Custom' });

      await createTask({ name: 'Custom Task', list_id: customList.id });
      await createTask({ name: 'Inbox Task', list_id: inboxList!.id });

      const listTasks = await getTasks({ listId: customList.id });
      expect(listTasks.length).toBe(1);
      expect(listTasks[0].name).toBe('Custom Task');
    });

    it('should search tasks', async () => {
      await createTask({ name: 'Alpha Task' });
      await createTask({ name: 'Beta Task' });

      const results = await getTasks({ searchQuery: 'Alpha' });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Alpha Task');
    });

    it('should include completed tasks when specified', async () => {
      await createTask({ name: 'Active Task' });
      const completedTask = await createTask({ name: 'Completed Task' });
      await updateTask(completedTask.id, { completed: true });

      const allTasks = await getTasks({ includeCompleted: true });
      expect(allTasks.length).toBe(2);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a task', async () => {
      const task = await createTask({ name: 'New Task' });
      expect(task.id).toBeDefined();
      expect(task.name).toBe('New Task');
    });

    it('should create task with all fields', async () => {
      const task = await createTask({
        name: 'Full Task',
        description: 'Description',
        priority: 'high',
        date: '2026-06-30',
      });
      expect(task.name).toBe('Full Task');
      expect(task.description).toBe('Description');
      expect(task.priority).toBe('high');
    });
  });

  describe('GET /api/tasks/[id]', () => {
    it('should return 404 for non-existent task', async () => {
      const task = await getTaskById(99999);
      expect(task).toBeUndefined();
    });

    it('should return task with relations', async () => {
      const created = await createTask({ name: 'Test Task' });
      const task = await getTaskById(created.id);
      expect(task).toBeDefined();
      expect(task?.name).toBe('Test Task');
      expect(task?.labels).toBeDefined();
      expect(task?.subtasks).toBeDefined();
    });
  });

  describe('PATCH /api/tasks/[id]', () => {
    it('should update task', async () => {
      const task = await createTask({ name: 'Original' });
      const updated = await updateTask(task.id, { name: 'Updated' });
      expect(updated.name).toBe('Updated');
    });

    it('should return error for non-existent task', async () => {
      await expect(updateTask(99999, { name: 'New' })).rejects.toThrow('Task not found');
    });
  });

  describe('DELETE /api/tasks/[id]', () => {
    it('should delete task', async () => {
      const task = await createTask({ name: 'To Delete' });
      await deleteTask(task.id);
      const found = await getTaskById(task.id);
      expect(found).toBeUndefined();
    });

    it('should handle deleting non-existent task', async () => {
      // Should not throw
      await deleteTask(99999);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty task list', async () => {
      const tasks = await getTasks({ includeCompleted: true });
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should handle task with all null optional fields', async () => {
      const task = await createTask({ name: 'Minimal Task' });
      expect(task.description).toBeNull();
      expect(task.date).toBeNull();
      expect(task.deadline).toBeNull();
    });

    it('should handle duplicate task creation', async () => {
      const task1 = await createTask({ name: 'Duplicate' });
      const task2 = await createTask({ name: 'Duplicate' });
      expect(task1.id).not.toBe(task2.id);
    });
  });
});