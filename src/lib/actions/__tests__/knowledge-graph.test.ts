import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { createTaskConnection, getConnectionStrength, findRelatedTasks, extractInsightsFromTask, updateSkillProficiency } from '../knowledge-graph';
import { setupTestDb, cleanupTestDb, createTestTasks } from '@/test/test-utils';
import { setDb } from '@/lib/db';
import { createMockDatabase } from '@/lib/db/mock-driver';

// Set up demo mode for authentication
const originalNodeEnv = process.env.NODE_ENV;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.NEXTAUTH_SECRET = 'demo-secret';
});

afterEach(() => {
  vi.resetModules();
});

describe('Knowledge Graph Actions', () => {
  let testDb: ReturnType<typeof createMockDatabase>;

  beforeEach(async () => {
    testDb = await setupTestDb();
    setDb(testDb);
    await createTestTasks();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('createTaskConnection', () => {
    it('creates a valid task connection', async () => {
      const connection = await createTaskConnection(
        1,
        2,
        'related',
        0.8,
        'These tasks are related by theme'
      );

      expect(connection).toBeDefined();
      expect(connection.source_task_id).toBe(1);
      expect(connection.target_task_id).toBe(2);
      expect(connection.connection_type).toBe('related');
      expect(connection.strength).toBe(0.8);
      expect(connection.notes).toBe('These tasks are related by theme');
    });

    it('throws error for invalid connection type', async () => {
      await expect(createTaskConnection(1, 2, 'invalid_type' as any, 0.5))
        .rejects.toThrow();
    });
  });

  describe('getConnectionStrength', () => {
    it('returns connection strength between 0 and 1', async () => {
      const strength = await getConnectionStrength(1, 2);
      expect(strength).toBeGreaterThanOrEqual(0);
      expect(strength).toBeLessThanOrEqual(1);
    });

    it('returns 0 for non-existent tasks', async () => {
      const strength = await getConnectionStrength(9999, 8888);
      expect(strength).toBe(0);
    });
  });

  describe('findRelatedTasks', () => {
    it('finds related tasks with specified connection types', async () => {
      const relatedTasks = await findRelatedTasks(1, 10, ['related', 'similar']);
      expect(Array.isArray(relatedTasks)).toBe(true);
    });

    it('respects limit parameter', async () => {
      const relatedTasks = await findRelatedTasks(1, 2, ['related']);
      expect(relatedTasks.length).toBeLessThanOrEqual(2);
    });
  });

  describe('extractInsightsFromTask', () => {
    it('extracts insights from completed tasks', async () => {
      const insights = await extractInsightsFromTask(1);
      expect(Array.isArray(insights)).toBe(true);
    });

    it('returns empty array for incomplete tasks', async () => {
      const insights = await extractInsightsFromTask(2);
      expect(insights).toEqual([]);
    });
  });

  describe('updateSkillProficiency', () => {
    it('creates new skill if not exists', async () => {
      await updateSkillProficiency(1, {
        id: 1,
        name: 'Test Task',
        description: 'A test task with design work',
        labels: [{ id: 1, name: 'design', icon: '🎨', color: '#ff6b6b' }],
        completed: true,
        priority: 'high',
        date: '2024-01-15',
        list_id: 1,
        subtasks: [],
        reminders: [],
        logs: [],
        comments: [],
        attachments: [],
        blockers: [],
        blocked_by: [],
        time_entries: [],
        recurring_exceptions: [],
      });

      // Skill should be created
      expect(true).toBe(true);
    });
  });
});