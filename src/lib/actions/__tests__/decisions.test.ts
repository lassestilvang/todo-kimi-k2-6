import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import {
  createDecisionEntry,
  getUserDecisionHistory,
  analyzeDecisionOutcomes,
  updateDecisionEntry,
  deleteDecisionEntry,
  getDecisionTemplates,
  createDecisionTemplate,
  deleteDecisionTemplate,
  getTaskDecisions,
} from '../decisions';
import { setupTestDb, cleanupTestDb } from '@/test/test-utils';
import { setDb } from '@/lib/db';

// Set up demo mode for authentication
const originalNodeEnv = process.env.NODE_ENV;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

beforeAll(() => {
  (process.env as any).NODE_ENV = 'test';
  (process.env as any).NEXTAUTH_SECRET = 'demo-secret';
});

describe('Decision Journal Actions', () => {
  beforeEach(async () => {
    const testDb = await setupTestDb();
    setDb(testDb);
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('createDecisionEntry', () => {
    it('creates a decision entry with options', async () => {
      const { entry, optionIds } = await createDecisionEntry({
        task_id: 1,
        decision_type: 'priority',
        question: 'Should I prioritize this task?',
        chosen_option_id: 1,
        rationale: 'High impact project with tight deadline',
        options: [
          { option_text: 'Do it now', pros: JSON.stringify(['Immediate progress']), cons: JSON.stringify(['High energy required']) } as any,
          { option_text: 'Schedule it', pros: JSON.stringify(['Better planning']), cons: JSON.stringify(['May delay']) } as any,
        ],
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeGreaterThan(0);
      expect(entry.decision_type).toBe('priority');
      expect(entry.question).toBe('Should I prioritize this task?');
      expect(optionIds).toBeDefined();
      expect(optionIds.length).toBe(2);
    });

    it('creates a decision entry without options', async () => {
      const { entry, optionIds } = await createDecisionEntry({
        task_id: 1,
        decision_type: 'approach',
        question: 'What approach should I take?',
        options: [],
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeGreaterThan(0);
      expect(entry.decision_type).toBe('approach');
      expect(optionIds).toEqual([]);
    });

    it('creates a decision entry without task_id', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'tool',
        question: 'Which tool should I use?',
        options: [],
      });

      expect(entry).toBeDefined();
      // task_id may be undefined or null depending on mock behavior
      expect(entry.task_id === null || entry.task_id === undefined).toBe(true);
    });

    it('throws error for unauthenticated user', async () => {
      // Clear demo mode to test authentication requirement
      const originalSecret = process.env.NEXTAUTH_SECRET;
      (process.env as any).NEXTAUTH_SECRET = '';

      // Need to reimport to pick up the new env var
      vi.resetModules();
      const { createDecisionEntry: createEntryNoAuth } = await import('../decisions');

      await expect(createEntryNoAuth({
        task_id: 1,
        decision_type: 'priority',
        question: 'Test question',
        options: []
      })).rejects.toThrow('Authentication required');

      (process.env as any).NEXTAUTH_SECRET = originalSecret;
    });
  });

  describe('getUserDecisionHistory', () => {
    it('returns empty array when no decisions exist', async () => {
      const history = await getUserDecisionHistory(999);
      expect(history).toEqual([]);
    });

    it('filters by decision type', async () => {
      const priorityDecisions = await getUserDecisionHistory(1, {
        decisionType: 'priority'
      });
      expect(Array.isArray(priorityDecisions)).toBe(true);
    });

    it('filters by date range', async () => {
      const recentDecisions = await getUserDecisionHistory(1, {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });
      expect(Array.isArray(recentDecisions)).toBe(true);
    });

    it('filters with limit', async () => {
      const limitedDecisions = await getUserDecisionHistory(1, {
        limit: 5,
      });
      expect(Array.isArray(limitedDecisions)).toBe(true);
    });

    it('filters by task ID', async () => {
      const taskDecisions = await getUserDecisionHistory(1, {
        taskId: 1,
      });
      expect(Array.isArray(taskDecisions)).toBe(true);
    });
  });

  describe('getTaskDecisions', () => {
    it('returns decisions for a task', async () => {
      const decisions = await getTaskDecisions(1);
      expect(Array.isArray(decisions)).toBe(true);
    });

    it('returns empty array for non-existent task', async () => {
      const decisions = await getTaskDecisions(99999);
      expect(decisions).toEqual([]);
    });
  });

  describe('updateDecisionEntry', () => {
    it('updates decision question', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'priority',
        question: 'Original question',
        options: [],
      });

      const updated = await updateDecisionEntry(entry.id, 1, {
        question: 'Updated question',
      });

      expect(updated?.question).toBe('Updated question');
    });

    it('updates decision outcome', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'approach',
        question: 'Test question',
        options: [],
      });

      const updated = await updateDecisionEntry(entry.id, 1, {
        outcome: 'Successful outcome',
        outcome_rating: 1,
      });

      expect(updated?.outcome).toBe('Successful outcome');
      expect(updated?.outcome_rating).toBe(1);
    });

    it('throws error for non-existent decision', async () => {
      await expect(updateDecisionEntry(99999, 1, { question: 'Test' }))
        .rejects.toThrow('Decision entry not found or not accessible');
    });
  });

  describe('deleteDecisionEntry', () => {
    it('deletes a decision entry', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'priority',
        question: 'To be deleted',
        options: [],
      });

      const result = await deleteDecisionEntry(entry.id, 1);
      expect(result).toBe(true);
    });

    it('throws error for non-existent decision', async () => {
      await expect(deleteDecisionEntry(99999, 1))
        .rejects.toThrow('Decision entry not found or not accessible');
    });
  });

  describe('analyzeDecisionOutcomes', () => {
    it('returns analysis structure', async () => {
      const analysis = await analyzeDecisionOutcomes(1);

      expect(analysis).toBeDefined();
      expect(analysis.total_decisions).toBeDefined();
      expect(analysis.decision_types).toBeDefined();
      expect(analysis.outcome_quality).toBeDefined();
      expect(analysis.patterns).toBeDefined();
      expect(analysis.learning_insights).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    it('calculates outcome quality metrics', async () => {
      const analysis = await analyzeDecisionOutcomes(1);

      expect(analysis.outcome_quality.average_rating).toBeDefined();
      expect(analysis.outcome_quality.positive_outcomes).toBeGreaterThanOrEqual(0);
      expect(analysis.outcome_quality.negative_outcomes).toBeGreaterThanOrEqual(0);
    });

    it('filters by decision type', async () => {
      const analysis = await analyzeDecisionOutcomes(1, {
        decisionType: 'priority',
      });
      expect(analysis).toBeDefined();
    });

    it('filters by time frame', async () => {
      const analysis = await analyzeDecisionOutcomes(1, {
        timeFrame: '30_days',
      });
      expect(analysis).toBeDefined();
    });
  });

  describe('decision templates', () => {
    describe('createDecisionTemplate', () => {
      it('creates a decision template', async () => {
        const template = await createDecisionTemplate(1, {
          name: 'Priority Template',
          prompt_template: 'Should I prioritize {task}?',
          option_template: '{option_text}',
        });

        expect(template.name).toBe('Priority Template');
        expect(template.prompt_template).toBe('Should I prioritize {task}?');
      });

      it('creates template without option template', async () => {
        const template = await createDecisionTemplate(1, {
          name: 'Simple Template',
          prompt_template: 'Simple prompt',
        });

        expect(template.name).toBe('Simple Template');
        expect(template.option_template).toBeNull();
      });
    });

    describe('getDecisionTemplates', () => {
      it('returns empty array when no templates', async () => {
        const templates = await getDecisionTemplates(1);
        expect(templates).toEqual([]);
      });

      it('returns templates for user', async () => {
        await createDecisionTemplate(1, {
          name: 'Template 1',
          prompt_template: 'Prompt 1',
        });

        const templates = await getDecisionTemplates(1);
        expect(templates.length).toBe(1);
      });
    });

    describe('deleteDecisionTemplate', () => {
      it('deletes a template', async () => {
        const template = await createDecisionTemplate(1, {
          name: 'To Delete',
          prompt_template: 'Prompt',
        });

        const result = await deleteDecisionTemplate(template.id, 1);
        expect(result).toBe(true);
      });

      it('returns false for non-existent template', async () => {
        const result = await deleteDecisionTemplate(99999, 1);
        expect(result).toBe(false);
      });
    });
  });
});