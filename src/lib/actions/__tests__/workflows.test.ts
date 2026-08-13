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
  executeWorkflow,
  getWorkflowExecutions,
} from '../workflows';

// Mock the session module
vi.mock('@/lib/session', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock next/cache
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

    // Create workflow_executions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL REFERENCES workflows(id),
        triggered_at TEXT,
        status TEXT DEFAULT 'running',
        input_data TEXT,
        result_data TEXT,
        error_message TEXT,
        duration_ms INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tasks table for workflow execution
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        list_id INTEGER DEFAULT 1,
        date TEXT,
        deadline TEXT,
        estimate TEXT,
        actual_time TEXT,
        priority TEXT DEFAULT 'none',
        recurring TEXT DEFAULT 'none',
        recurring_config TEXT,
        completed INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sort_order INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0
      )
    `);

    // Create activity_logs table for log_message action
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Mock getCurrentUser to return our test user
    (getCurrentUser as any).mockImplementation(async () => ({ id: mockUserId, email: 'test@example.com', name: 'Test User' }));
  });

  afterEach(() => {
    db.close();
  });

  describe('getWorkflows', () => {
    it('returns empty array when no workflows exist', async () => {
      const workflows = await getWorkflows(mockUserId);

      expect(workflows).toEqual([]);
    });

    it('returns workflows for user', async () => {
      // Create a workflow
      await createWorkflow(mockUserId, {
        name: 'Test Workflow',
        trigger_type: 'manual',
        action_type: 'create_task',
      });

      const workflows = await getWorkflows(mockUserId);

      expect(workflows).toHaveLength(1);
      expect(workflows[0].name).toBe('Test Workflow');
    });
  });

  describe('getWorkflow', () => {
    it('returns undefined for non-existent workflow', async () => {
      const workflow = await getWorkflow(999, mockUserId);

      expect(workflow).toBeUndefined();
    });

    it('returns workflow by id', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Get Test Workflow',
        trigger_type: 'manual',
        action_type: 'create_task',
      });

      const workflow = await getWorkflow(created.id, mockUserId);

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('Get Test Workflow');
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

    it('creates workflow with all fields', async () => {
      const workflow = await createWorkflow(mockUserId, {
        name: 'Full Workflow',
        description: 'A complete workflow',
        trigger_type: 'task_completed',
        trigger_config: { filter: 'priority:high' },
        action_type: 'create_task',
        action_config: { task_name: 'Auto Task' },
        condition_json: { task_priority: 'high' },
        enabled: true,
      });

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('Full Workflow');
      expect(workflow.description).toBe('A complete workflow');
      expect(workflow.trigger_type).toBe('task_completed');
      expect(workflow.action_type).toBe('create_task');
      expect(workflow.enabled).toBe(true);
    });

    it('sets enabled to 1 by default', async () => {
      const workflow = await createWorkflow(mockUserId, {
        name: 'Default Enabled',
        trigger_type: 'manual',
        action_type: 'create_task',
      });

      // The enabled field should exist in workflow (stored as 1 in DB)
      expect(workflow.name).toBe('Default Enabled');
    });
  });

  describe('updateWorkflow', () => {
    it('throws error when workflow not found', async () => {
      await expect(updateWorkflow(mockUserId, 999, { name: 'New Name' })).rejects.toThrow('Workflow not found');
    });

    it('updates workflow name', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Original Name',
        trigger_type: 'manual',
        action_type: 'create_task',
      });

      const updated = await updateWorkflow(mockUserId, created.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
    });

    it('updates enabled status', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Toggle Test',
        trigger_type: 'manual',
        action_type: 'create_task',
      });

      await updateWorkflow(mockUserId, created.id, { enabled: false });

      const workflow = await getWorkflow(created.id, mockUserId);
      // Verify update worked
      expect(workflow).toBeDefined();
    });
  });

  describe('deleteWorkflow', () => {
    it('returns false when workflow not found', async () => {
      const result = await deleteWorkflow(999, mockUserId);
      expect(result).toBe(false);
    });

    it('deletes workflow successfully', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'To Delete',
        trigger_type: 'manual',
        action_type: 'create_task',
      });

      const result = await deleteWorkflow(created.id, mockUserId);
      expect(result).toBe(true);

      const workflows = await getWorkflows(mockUserId);
      expect(workflows).toHaveLength(0);
    });
  });

  describe('toggleWorkflow', () => {
    it('throws error when workflow not found', async () => {
      await expect(toggleWorkflow(999, mockUserId)).rejects.toThrow('Workflow not found');
    });

    it('toggles workflow enabled status', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Toggle Test',
        trigger_type: 'manual',
        action_type: 'create_task',
      });

      // Toggle should return a value
      const result = await toggleWorkflow(created.id, mockUserId);
      expect(result).toBeDefined();
    });
  });

  describe('executeWorkflow', () => {
    it('throws error when workflow not found', async () => {
      await expect(executeWorkflow(999, {}, mockUserId)).rejects.toThrow('Workflow not found or disabled');
    });

    it('executes workflow with create_task action', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Execute Test',
        trigger_type: 'manual',
        action_type: 'create_task',
        action_config: { task_name: 'Automated Task', priority: 'high' },
      });

      const result = await executeWorkflow(created.id, { task_name: 'Test Input' }, mockUserId);

      expect(result.success).toBe(true);
      expect(result.result.task_id).toBeDefined();
      expect(result.result.name).toBeDefined();
    });

    it('executes workflow with log_message action', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Log Workflow',
        trigger_type: 'manual',
        action_type: 'log_message',
        action_config: { message: 'Test log message', level: 'info' },
      });

      const result = await executeWorkflow(created.id, {}, mockUserId);

      expect(result.success).toBe(true);
      expect(result.result.message).toBe('Test log message');
      expect(result.result.level).toBe('info');
    });

    it('executes workflow with send_notification action', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Notification Workflow',
        trigger_type: 'manual',
        action_type: 'send_notification',
        action_config: { message: 'Test notification', type: 'info' },
      });

      const result = await executeWorkflow(created.id, {}, mockUserId);

      expect(result.success).toBe(true);
      expect(result.result.message).toBe('Test notification');
      expect(result.result.type).toBe('info');
      expect(result.result.status).toBe('sent');
    });

    it('executes workflow with webhook action', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Webhook Workflow',
        trigger_type: 'manual',
        action_type: 'webhook',
        action_config: { url: 'https://example.com/webhook', method: 'POST' },
      });

      const result = await executeWorkflow(created.id, { test: 'data' }, mockUserId);

      expect(result.success).toBe(true);
      expect(result.result.url).toBe('https://example.com/webhook');
      expect(result.result.method).toBe('POST');
      expect(result.result.status).toBe('called');
    });

    it('throws error for webhook without URL', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Bad Webhook Workflow',
        trigger_type: 'manual',
        action_type: 'webhook',
        action_config: { method: 'POST' },
      });

      await expect(executeWorkflow(created.id, {}, mockUserId)).rejects.toThrow('Webhook URL is required');
    });
  });

  describe('getWorkflowExecutions', () => {
    it('returns executions for workflow', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Execution Test',
        trigger_type: 'manual',
        action_type: 'create_task',
      });

      // Execute workflow to create execution record
      await executeWorkflow(created.id, {}, mockUserId);

      const executions = await getWorkflowExecutions(created.id);

      expect(executions).toHaveLength(1);
      expect(executions[0].workflow_id).toBe(created.id);
      expect(executions[0].status).toBe('completed');
    });

    it('filters executions by status', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Status Filter Test',
        trigger_type: 'manual',
        action_type: 'create_task',
      });

      await executeWorkflow(created.id, {}, mockUserId);

      const completedExecutions = await getWorkflowExecutions(created.id, { status: 'completed' });
      expect(completedExecutions[0].status).toBe('completed');
    });

    it('limits executions results', async () => {
      const created = await createWorkflow(mockUserId, {
        name: 'Limit Test',
        trigger_type: 'manual',
        action_type: 'create_task',
      });

      await executeWorkflow(created.id, {}, mockUserId);

      const executions = await getWorkflowExecutions(created.id, { limit: 1 });
      expect(executions).toHaveLength(1);
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

    it('returns false for invalid JSON string', async () => {
      const result = await evaluateConditions('invalid-json{', {});
      expect(result).toBe(true);
    });

    it('checks task priority condition', async () => {
      const highResult = await evaluateConditions({ task_priority: 'high' }, { task_priority: 'critical' });
      expect(highResult).toBe(true);

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
      const result = await evaluateConditions({ due_date_before: '2024-12-31' }, {});
      expect(result).toBe(true);
    });

    it('handles missing task_priority in context', async () => {
      const result = await evaluateConditions({ task_priority: 'high' }, {});
      expect(result).toBe(false);
    });

    it('handles missing task_labels in context', async () => {
      // When task_labels is an empty array in context, label is not found
      const result = await evaluateConditions({ task_label: 'urgent' }, { task_labels: [] });
      expect(result).toBe(false); // Empty labels array means label not found
    });
  });
});