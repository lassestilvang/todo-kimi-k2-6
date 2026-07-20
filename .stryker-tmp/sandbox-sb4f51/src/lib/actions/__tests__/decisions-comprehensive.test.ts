// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createDecisionEntry,
  getUserDecisionHistory,
  analyzeDecisionOutcomes,
  updateDecisionEntry,
  deleteDecisionEntry,
  getTaskDecisions,
  getDecisionTemplates,
  createDecisionTemplate,
  deleteDecisionTemplate,
} from '../decisions';
import { setupTestDb, cleanupTestDb } from '@/test/test-utils';
import { setDb, getDb } from '@/lib/db';
import { aiCache } from '@/lib/ai/providers';

// Set up demo mode for authentication
const originalNodeEnv = process.env.NODE_ENV;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.NEXTAUTH_SECRET = 'demo-secret';
});

afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
});

describe('Decisions - Comprehensive Tests', () => {
  beforeEach(async () => {
    // Clear AI cache before each test to avoid stale cached results
    aiCache.clear();

    const testDb = await setupTestDb();
    setDb(testDb);

    // Create test user and task
    const db = getDb();
    db.exec(`
      INSERT INTO users (id, email, name, created_at) VALUES (1, 'test@example.com', 'Test User', datetime('now'))
    `);

    db.exec(`
      INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, completed, created_at, updated_at, sort_order, archived)
      VALUES (1, 1, 'Test Task', 'A test task for decisions', 1, '2024-01-15', '2024-01-20', 'high', 'none', 0, datetime('now'), datetime('now'), 0, 0)
    `);

    db.exec(`
      INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, completed, created_at, updated_at, sort_order, archived)
      VALUES (2, 1, 'Another Task', 'Another test task', 1, '2024-01-16', '2024-01-21', 'medium', 'none', 0, datetime('now'), datetime('now'), 1, 0)
    `);
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('createDecisionEntry', () => {
    it('creates decision with all fields', async () => {
      const { entry, optionIds } = await createDecisionEntry({
        task_id: 1,
        decision_type: 'approach',
        question: 'What approach should we take?',
        chosen_option_id: 1,
        rationale: 'Need to think carefully about this',
        outcome: 'We went with approach A',
        outcome_notes: 'It worked well',
        outcome_rating: 1,
        options: [
          { option_text: 'Approach A', pros: ['Pros A'], cons: ['Cons A'] },
          { option_text: 'Approach B', pros: ['Pros B'], cons: ['Cons B'] },
        ],
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeGreaterThan(0);
      expect(entry.decision_type).toBe('approach');
      expect(entry.chosen_option_id).toBe(1);
      expect(entry.rationale).toBe('Need to think carefully about this');
      expect(entry.outcome).toBe('We went with approach A');
      expect(entry.outcome_rating).toBe(1);
      expect(optionIds.length).toBe(2);
    });

    it('creates decision with no options', async () => {
      const { entry } = await createDecisionEntry({
        task_id: 1,
        decision_type: 'tool',
        question: 'Which tool to use?',
      });

      expect(entry.id).toBeGreaterThan(0);
    });

    it('creates decision with minimal fields', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'priority',
        question: 'Priority question',
      });

      expect(entry).toBeDefined();
    });

    it('creates decision with multiple options', async () => {
      const { entry, optionIds } = await createDecisionEntry({
        task_id: 1,
        decision_type: 'approach',
        question: 'Multi-option question',
        options: [
          { option_text: 'Option 1' },
          { option_text: 'Option 2' },
          { option_text: 'Option 3' },
        ],
      });

      expect(optionIds.length).toBe(3);
    });

    it('creates decision with pros and cons', async () => {
      const { entry } = await createDecisionEntry({
        task_id: 1,
        decision_type: 'priority',
        question: 'Decision with pros/cons',
        options: [
          { option_text: 'Option A', pros: ['Good point 1', 'Good point 2'], cons: ['Bad point 1'] },
          { option_text: 'Option B', pros: ['Another pro'], cons: ['Con 1', 'Con 2'] },
        ],
      });

      expect(entry.id).toBeGreaterThan(0);
    });
  });

  describe('getUserDecisionHistory', () => {
    it('returns empty array when no decisions exist', async () => {
      const history = await getUserDecisionHistory(999);
      expect(history).toEqual([]);
    });

    it('returns decisions filtered by task ID', async () => {
      await createDecisionEntry({
        task_id: 1,
        decision_type: 'priority',
        question: 'Priority decision',
        options: [],
      });

      const history = await getUserDecisionHistory(1, { taskId: 1 });
      expect(history.length).toBeGreaterThan(0);
    });

    it('returns decisions filtered by type', async () => {
      await createDecisionEntry({
        task_id: 1,
        decision_type: 'approach',
        question: 'Approach 1',
        options: [],
      });

      await createDecisionEntry({
        task_id: 1,
        decision_type: 'tool',
        question: 'Tool decision',
        options: [],
      });

      const approachHistory = await getUserDecisionHistory(1, { decisionType: 'approach' });
      expect(approachHistory.length).toBeGreaterThan(0);
    });

    it('returns decisions filtered by date range', async () => {
      await createDecisionEntry({
        task_id: 1,
        decision_type: 'test',
        question: 'Test question',
        options: [],
      });

      const history = await getUserDecisionHistory(1, {
        startDate: '2024-01-01',
        endDate: '2025-12-31',
      });

      expect(Array.isArray(history)).toBe(true);
    });

    it('returns decisions with limit', async () => {
      await createDecisionEntry({
        task_id: 1,
        decision_type: 'test1',
        question: 'Question 1',
        options: [],
      });

      await createDecisionEntry({
        task_id: 1,
        decision_type: 'test2',
        question: 'Question 2',
        options: [],
      });

      const limitedDecisions = await getUserDecisionHistory(1, { limit: 1 });
      expect(Array.isArray(limitedDecisions)).toBe(true);
    });
  });

  describe('getTaskDecisions', () => {
    it('returns decisions for a task', async () => {
      await createDecisionEntry({
        task_id: 1,
        decision_type: 'test',
        question: 'Test question',
        options: [],
      });

      const decisions = await getTaskDecisions(1);
      expect(decisions.length).toBeGreaterThan(0);
    });

    it('returns empty array for non-existent task', async () => {
      const decisions = await getTaskDecisions(99999);
      expect(decisions).toEqual([]);
    });

    it('returns decisions with options', async () => {
      await createDecisionEntry({
        task_id: 1,
        decision_type: 'test',
        question: 'Question with options',
        options: [{ option_text: 'Option 1' }, { option_text: 'Option 2' }],
      });

      const decisions = await getTaskDecisions(1);
      expect(decisions[0].options?.length).toBe(2);
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

    it('updates decision options', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'approach',
        question: 'Test question',
        options: [],
      });

      const updated = await updateDecisionEntry(entry.id, 1, {
        chosen_option_id: 1,
      });

      expect(updated?.chosen_option_id).toBe(1);
    });

    it('updates outcome and rating', async () => {
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
        decision_type: 'test',
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
      const analysis = await analyzeDecisionOutcomes(1, {});

      expect(analysis).toBeDefined();
      expect(analysis.total_decisions).toBeDefined();
      expect(analysis.decision_types).toBeDefined();
      expect(typeof analysis.outcome_quality).toBe('object');
      expect(typeof analysis.patterns).toBe('object');
      expect(typeof analysis.learning_insights).toBe('object');
    });

    it('calculates outcome quality metrics', async () => {
      // Create a decision with outcome
      await createDecisionEntry({
        task_id: 1,
        decision_type: 'approach',
        question: 'Test question',
        options: [],
        outcome: 'Success',
        outcome_rating: 1,
      });

      const analysis = await analyzeDecisionOutcomes(1, {});

      expect(analysis.outcome_quality.total_decisions).toBeGreaterThan(0);
    });

    it('filters by decision type', async () => {
      const result = await analyzeDecisionOutcomes(1, { decisionType: 'test' });
      expect(result).toBeDefined();
    });

    it('filters by time frame', async () => {
      const result = await analyzeDecisionOutcomes(1, { timeFrame: '30_days' });
      expect(result).toBeDefined();
    });
  });

  describe('decision templates', () => {
    describe('createDecisionTemplate', () => {
      it('creates template successfully', async () => {
        const template = await createDecisionTemplate(1, {
          name: 'Priority Template',
          prompt_template: 'Should I prioritize {task}?',
          option_template: '{option_text}',
        });

        expect(template.id).toBeGreaterThan(0);
        expect(template.name).toBe('Priority Template');
        expect(template.prompt_template).toBe('Should I prioritize {task}?');
      });

      it('creates template without option template', async () => {
        const template = await createDecisionTemplate(1, {
          name: 'Simple Template',
          prompt_template: 'Simple prompt',
        });

        expect(template.name).toBe('Simple Template');
      });
    });

    describe('getDecisionTemplates', () => {
      it('returns empty array initially', async () => {
        const templates = await getDecisionTemplates(1);
        expect(templates).toEqual([]);
      });

      it('returns created templates', async () => {
        await createDecisionTemplate(1, {
          name: 'Test Template',
          prompt_template: 'Test prompt',
        });

        const templates = await getDecisionTemplates(1);
        expect(templates.length).toBeGreaterThan(0);
      });
    });

    describe('deleteDecisionTemplate', () => {
      it('returns true for deleted template', async () => {
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

  describe('Decision Types', () => {
    it('creates priority decision', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'priority',
        question: 'Priority question',
        options: [],
      });

      expect(entry.decision_type).toBe('priority');
    });

    it('creates approach decision', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'approach',
        question: 'Approach question',
        options: [],
      });

      expect(entry.decision_type).toBe('approach');
    });

    it('creates tool decision', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'tool',
        question: 'Tool question',
        options: [],
      });

      expect(entry.decision_type).toBe('tool');
    });

    it('creates timeline decision', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'timeline',
        question: 'Timeline question',
        options: [],
      });

      expect(entry.decision_type).toBe('timeline');
    });

    it('creates allocation decision', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'allocation',
        question: 'Allocation question',
        options: [],
      });

      expect(entry.decision_type).toBe('allocation');
    });

    it('creates cancellation decision', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'cancellation',
        question: 'Cancellation question',
        options: [],
      });

      expect(entry.decision_type).toBe('cancellation');
    });
  });

  describe('Edge Cases', () => {
    it('handles decision with null task_id', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'test',
        question: 'Question without task',
        options: [],
      });

      expect(entry).toBeDefined();
    });

    it('handles decision with empty rationale', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'test',
        question: 'Test question',
        rationale: '',
        options: [],
      });

      expect(entry.rationale).toBe('');
    });

    it('handles decision with null outcome rating', async () => {
      const { entry } = await createDecisionEntry({
        decision_type: 'test',
        question: 'Test question',
        options: [],
      });

      expect(entry.outcome_rating).toBeNull();
    });
  });
});