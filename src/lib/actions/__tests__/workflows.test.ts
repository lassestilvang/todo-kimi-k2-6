import { describe, it, expect, vi } from "vitest";
import {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  executeWorkflow,
  getWorkflowExecutions,
  checkTriggers,
  evaluateConditions,
} from "@/lib/actions/workflows";

// Mock the database module
vi.mock('@/lib/db', () => ({
  getDb: () => ({
    prepare: vi.fn().mockReturnThis(),
    all: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue({ count: 0 }),
    run: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: 1 }),
  }),
}));

describe('workflows exports', () => {
  it('exports getWorkflows function', () => {
    expect(getWorkflows).toBeDefined();
    expect(typeof getWorkflows).toBe('function');
  });

  it('exports getWorkflow function', () => {
    expect(getWorkflow).toBeDefined();
    expect(typeof getWorkflow).toBe('function');
  });

  it('exports createWorkflow function', () => {
    expect(createWorkflow).toBeDefined();
    expect(typeof createWorkflow).toBe('function');
  });

  it('exports updateWorkflow function', () => {
    expect(updateWorkflow).toBeDefined();
    expect(typeof updateWorkflow).toBe('function');
  });

  it('exports deleteWorkflow function', () => {
    expect(deleteWorkflow).toBeDefined();
    expect(typeof deleteWorkflow).toBe('function');
  });

  it('exports toggleWorkflow function', () => {
    expect(toggleWorkflow).toBeDefined();
    expect(typeof toggleWorkflow).toBe('function');
  });

  it('exports executeWorkflow function', () => {
    expect(executeWorkflow).toBeDefined();
    expect(typeof executeWorkflow).toBe('function');
  });

  it('exports getWorkflowExecutions function', () => {
    expect(getWorkflowExecutions).toBeDefined();
    expect(typeof getWorkflowExecutions).toBe('function');
  });

  it('exports checkTriggers function', () => {
    expect(checkTriggers).toBeDefined();
    expect(typeof checkTriggers).toBe('function');
  });

  it('exports evaluateConditions function', () => {
    expect(evaluateConditions).toBeDefined();
    expect(typeof evaluateConditions).toBe('function');
  });
});

describe('checkTriggers', () => {
  it('returns true for manual trigger', async () => {
    const result = await checkTriggers('manual', {}, 1);
    expect(result).toBe(true);
  });
});

describe('evaluateConditions', () => {
  it('returns true when no conditions', async () => {
    const result = await evaluateConditions(null, {});
    expect(result).toBe(true);
  });

  it('returns true when conditions is empty object', async () => {
    const result = await evaluateConditions({}, { task_priority: 'high' });
    expect(result).toBe(true);
  });
});