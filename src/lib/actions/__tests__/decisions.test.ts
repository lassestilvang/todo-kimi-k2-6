import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDecisionEntry, getUserDecisionHistory, analyzeDecisionOutcomes } from '../decisions';
import { setupTestDb, cleanupTestDb } from '@/test/test-utils';

describe('Decision Journal Actions', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('createDecisionEntry', () => {
    it('creates a decision entry with options', async () => {
      const { entry, optionIds } = await createDecisionEntry({
        task_id: 1,
        user_id: 1,
        decision_type: 'priority',
        question: 'Should I prioritize this task?',
        chosen_option_id: 1,
        rationale: 'High impact project with tight deadline',
        options: [
          { option_text: 'Do it now', pros: ['Immediate progress'], cons: ['High energy required'] },
          { option_text: 'Schedule it', pros: ['Better planning'], cons: ['May delay'] },
        ],
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeGreaterThan(0);
      expect(entry.decision_type).toBe('priority');
      expect(entry.question).toBe('Should I prioritize this task?');
      expect(optionIds).toBeDefined();
      expect(optionIds.length).toBe(2);
    });

    it('throws error for unauthenticated user', async () => {
      await expect(createDecisionEntry({
        task_id: 1,
        decision_type: 'priority',
        question: 'Test question',
        options: []
      })).rejects.toThrow('Authentication required');
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
  });
});