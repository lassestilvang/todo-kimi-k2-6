import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setDb, resetDb, getDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';
import {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  checkTriggers,
  evaluateConditions,
} from '../workflows';

// Mock the session module
vi.mock('@/lib/session', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock next/cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(() => {}),
}));

// Mock the AI integration
vi.mock('@/lib/ai/providers', () => ({
  getAIManager: vi.fn(() => ({
    predictTaskDuration: vi.fn().mockResolvedValue({
      estimated_duration: 60,
      confidence: 0.9,
      factors: ['priority'],
    }),
    generateInsights: vi.fn().mockResolvedValue([]),
  })),
  aiCache: {
    get: vi.fn(() => null),
    set: vi.fn(),
  },
}));

import { getCurrentUser } from '@/lib/session';

const mockUserId = 1;

describe('Workflow Actions', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Create test user
    db.exec(`
      INSERT INTO users (id, email, name, created_at)
      VALUES (1, 'test@example.com', 'Test User', datetime('now'))
    `);

    // Create workflows table
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT NOT NULL,
        trigger_config TEXT,
        action_type TEXT NOT NULL,
        action_config TEXT,
        condition_json TEXT,
        enabled INTEGER DEFAULT 1,
        run_count INTEGER DEFAULT 0,
        last_run_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe('getWorkflows', () => {
    it('returns empty array when no workflows exist', async () => {
      const workflows = await getWorkflows(mockUserId);

      expect(workflows).toEqual([]);
    });
  });

  describe('getWorkflow', () => {
    it('returns undefined for non-existent workflow', async () => {
      const workflow = await getWorkflow(999, mockUserId);

      expect(workflow).toBeUndefined();
    });
  });

  describe('createWorkflow', () => {
    it('validates that name is required', async () => {
      await expect(createWorkflow(mockUserId, {
        name: '',
        trigger_type: 'manual',
        action_type: 'create_task',
      })).rejects.toThrow('Name is required');
    });

    it('throws error when name is whitespace only', async () => {
      await expect(createWorkflow(mockUserId, {
        name: '   ',
        trigger_type: 'manual',
        action_type: 'create_task',
      })).rejects.toThrow('Name is required');
    });
  });

  describe('updateWorkflow', () => {
    it('throws error when workflow not found', async () => {
      await expect(updateWorkflow(mockUserId, 999, { name: 'New Name' })).rejects.toThrow('Workflow not found');
    });
  });

  describe('deleteWorkflow', () => {
    it('returns false when workflow not found', async () => {
      const result = await deleteWorkflow(999, mockUserId);
      expect(result).toBe(false);
    });
  });

  describe('toggleWorkflow', () => {
    it('throws error when workflow not found', async () => {
      await expect(toggleWorkflow(999, mockUserId)).rejects.toThrow('Workflow not found');
    });
  });

  describe('checkTriggers', () => {
    it('returns true for manual trigger', async () => {
      const result = await checkTriggers('manual', {}, mockUserId);
      expect(result).toBe(true);
    });

    it('returns true for task_created trigger', async () => {
      const result = await checkTriggers('task_created', {}, mockUserId);
      expect(result).toBe(true);
    });

    it('returns true for task_completed trigger', async () => {
      const result = await checkTriggers('task_completed', {}, mockUserId);
      expect(result).toBe(true);
    });

    it('returns true for due_date trigger', async () => {
      const result = await checkTriggers('due_date', {}, mockUserId);
      expect(result).toBe(true);
    });

    it('returns true for cron trigger', async () => {
      const result = await checkTriggers('cron', {}, mockUserId);
      expect(result).toBe(true);
    });

    it('returns true for schedule trigger', async () => {
      const result = await checkTriggers('schedule', {}, mockUserId);
      expect(result).toBe(true);
    });

    it('returns false for unknown trigger type', async () => {
      const result = await checkTriggers('unknown' as any, {}, mockUserId);
      expect(result).toBe(false);
    });
  });

  describe('evaluateConditions', () => {
    it('returns true when conditions is null', async () => {
      const result = await evaluateConditions(null, {});
      expect(result).toBe(true);
    });

    it('returns true when conditions is undefined', async () => {
      const result = await evaluateConditions(undefined, {});
      expect(result).toBe(true);
    });

    it('evaluates string conditions as JSON', async () => {
      const jsonConditions = JSON.stringify({ task_priority: 'high' });
      const result = await evaluateConditions(jsonConditions, { task_priority: 'high' });
      expect(result).toBe(true);
    });

    it('checks task priority condition', async () => {
      const result = await evaluateConditions({ task_priority: 'high' }, { task_priority: 'critical' });
      expect(result).toBe(true);

      const lowResult = await evaluateConditions({ task_priority: 'high' }, { task_priority: 'medium' });
      expect(lowResult).toBe(false);
    });

    it('checks task label condition', async () => {
      const result = await evaluateConditions({ task_label: 'urgent' }, { task_labels: ['urgent', 'important'] });
      expect(result).toBe(true);

      const noLabelResult = await evaluateConditions({ task_label: 'urgent' }, { task_labels: ['not-urgent'] });
      expect(noLabelResult).toBe(false);
    });

    it('checks due date condition', async () => {
      const result = await evaluateConditions({ due_date_before: '2024-12-31' }, { due_date: '2024-06-15' });
      expect(result).toBe(true);

      const afterResult = await evaluateConditions({ due_date_before: '2024-06-01' }, { due_date: '2024-12-31' });
      expect(afterResult).toBe(false);
    });

    it('returns true when context missing optional fields for condition', async () => {
      // When due_date is missing from context, condition is effectively ignored
      const result = await evaluateConditions({ due_date_before: '2024-12-31' }, {});
      expect(result).toBe(true); // Condition is skipped when context field is missing
    });
  });
});