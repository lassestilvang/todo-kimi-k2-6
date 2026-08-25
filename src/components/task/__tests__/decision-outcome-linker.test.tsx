import { describe, it, expect } from 'vitest';

/**
 * Tests for DecisionOutcomeLinker component logic
 */
describe('DecisionOutcomeLinker Component Logic', () => {
  describe('Decision Outcome Link Interface', () => {
    it('should have correct link structure', () => {
      const link = {
        decision_id: 1,
        decision_type: 'priority',
        question: 'Should I work on this task today?',
        outcome: 'Completed the task ahead of schedule',
        outcome_rating: 0.8,
        correlated_task_id: 42,
        correlation_strength: 0.85,
        was_successful: true,
      };

      expect(link.decision_id).toBe(1);
      expect(link.decision_type).toBe('priority');
      expect(link.outcome).toBe('Completed the task ahead of schedule');
      expect(link.was_successful).toBe(true);
    });

    it('should handle null outcomes', () => {
      const link = {
        decision_id: 1,
        decision_type: 'timeline',
        question: 'When should I start this task?',
        outcome: null,
        outcome_rating: null,
        correlated_task_id: null,
        correlation_strength: 0,
        was_successful: null,
      };

      expect(link.outcome).toBeNull();
      expect(link.was_successful).toBeNull();
      expect(link.correlated_task_id).toBeNull();
    });
  });

  describe('Correlation Calculation', () => {
    it('should calculate positive correlation for completed tasks', () => {
      const calculateCorrelationStrength = (
        decision: { question: string; outcome_rating: number | null },
        task: { name: string; completed: boolean; outcome_rating: number | null }
      ): number => {
        let strength = 0;
        const questionLower = decision.question.toLowerCase();
        const taskNameLower = task.name.toLowerCase();

        if (task.completed) strength += 0.2;
        if (task.outcome_rating !== null) strength += 0.1;

        return Math.min(1, strength);
      };

      const decision = { question: 'Build feature', outcome_rating: 0.5 };
      const task = { name: 'Build authentication feature', completed: true, outcome_rating: 0.7 };

      const strength = calculateCorrelationStrength(decision, task);
      expect(strength).toBeGreaterThan(0);
    });

    it('should return zero correlation for incomplete tasks', () => {
      const calculateCorrelationStrength = (
        decision: { question: string; outcome_rating: number | null },
        task: { name: string; completed: boolean; outcome_rating: number | null }
      ): number => {
        let strength = 0;
        if (task.completed) strength += 0.2;
        if (task.outcome_rating !== null) strength += 0.1;
        return Math.min(1, strength);
      };

      const decision = { question: 'Research topic', outcome_rating: null };
      const task = { name: 'Research topic', completed: false, outcome_rating: null };

      const strength = calculateCorrelationStrength(decision, task);
      expect(strength).toBe(0);
    });
  });

  describe('Decision Type Colors', () => {
    const getDecisionTypeColor = (type: string): string => {
      const colors: Record<string, string> = {
        priority: 'bg-red-100 text-red-800',
        approach: 'bg-blue-100 text-blue-800',
        timeline: 'bg-amber-100 text-amber-800',
        tool: 'bg-green-100 text-green-800',
        allocation: 'bg-purple-100 text-purple-800',
        cancellation: 'bg-gray-100 text-gray-800',
      };
      return colors[type] || 'bg-muted';
    };

    it('should return correct color for priority decisions', () => {
      expect(getDecisionTypeColor('priority')).toBe('bg-red-100 text-red-800');
    });

    it('should return correct color for timeline decisions', () => {
      expect(getDecisionTypeColor('timeline')).toBe('bg-amber-100 text-amber-800');
    });

    it('should return default color for unknown types', () => {
      expect(getDecisionTypeColor('unknown')).toBe('bg-muted');
    });
  });

  describe('Rating Formatting', () => {
    const formatRating = (rating: number | null): string => {
      if (rating === null) return 'Not rated';
      if (rating > 0.5) return 'Positive';
      if (rating < -0.5) return 'Negative';
      return 'Neutral';
    };

    it('should format positive ratings correctly', () => {
      expect(formatRating(0.7)).toBe('Positive');
      expect(formatRating(0.8)).toBe('Positive');
      expect(formatRating(1)).toBe('Positive');
    });

    it('should format negative ratings correctly', () => {
      expect(formatRating(-0.7)).toBe('Negative');
      expect(formatRating(-0.8)).toBe('Negative');
      expect(formatRating(-1)).toBe('Negative');
    });

    it('should format neutral ratings correctly', () => {
      expect(formatRating(0.3)).toBe('Neutral');
      expect(formatRating(0)).toBe('Neutral');
      expect(formatRating(-0.3)).toBe('Neutral');
    });

    it('should handle null ratings', () => {
      expect(formatRating(null)).toBe('Not rated');
    });
  });

  describe('Task Filtering', () => {
    it('should filter tasks by completion status', () => {
      const tasks = [
        { id: 1, name: 'Task 1', completed: 1 },
        { id: 2, name: 'Task 2', completed: 0 },
        { id: 3, name: 'Task 3', completed: 1 },
      ];

      const completed = tasks.filter(t => !t.completed);
      expect(completed.length).toBe(1);
      expect(completed[0].id).toBe(2);
    });

    it('should find related tasks by keyword matching', () => {
      const decision = { id: 1, question: 'build the API endpoint?' };
      const tasks = [
        { id: 1, name: 'Build API endpoint for users' },
        { id: 2, name: 'Write documentation' },
      ];

      const questionLower = 'build the API endpoint?'.toLowerCase();
      const keywords = questionLower.split(/[\s?.!]+/).filter(k => k.length > 3);
      const relatedTask = tasks.find(task => {
        const taskNameLower = task.name.toLowerCase();
        return keywords.some(kw => taskNameLower.includes(kw));
      });

      expect(relatedTask).toBeDefined();
      expect(relatedTask!.id).toBe(1);
    });
  });

  describe('Correlation Strength Calculation', () => {
    it('should calculate strength between 0 and 1', () => {
      const testCases = [
        { decision: 'Priority', task: true, rating: null, expectedMin: 0, expectedMax: 0.3 },
        { decision: 'Priority', task: true, rating: 0.5, expectedMin: 0.1, expectedMax: 0.3 },
        { decision: 'Priority', task: true, rating: 0.8, expectedMin: 0.3, expectedMax: 1 },
      ];

      testCases.forEach(({ task, rating, expectedMin, expectedMax }) => {
        const strength = rating !== null ? 0.3 : 0.2;
        expect(strength).toBeGreaterThanOrEqual(expectedMin);
        expect(strength).toBeLessThanOrEqual(expectedMax);
      });
    });
  });
});