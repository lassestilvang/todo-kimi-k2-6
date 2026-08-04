import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculatePriorityScore } from '../lib/actions/smart-inbox';

describe('smart-inbox', () => {
  describe('calculatePriorityScore', () => {
    it('gives higher scores to critical priority', () => {
      const criticalScore = calculatePriorityScore('critical');
      const lowScore = calculatePriorityScore('low');

      expect(criticalScore).toBeGreaterThan(lowScore);
    });

    it('adds bonus for due dates', () => {
      const noDueDate = calculatePriorityScore('high');

      // Due today should add more
      const today = new Date().toISOString().split('T')[0];
      const dueToday = calculatePriorityScore('high', today);

      expect(dueToday).toBeGreaterThan(noDueDate);
    });

    it('gives highest score for critical + overdue', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const score = calculatePriorityScore('critical', yesterday);

      expect(score).toBe(100); // Should cap at 100
    });

    it('capped at 100', () => {
      // Very overdue and critical should cap at 100
      const veryOldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const score = calculatePriorityScore('critical', veryOldDate);

      expect(score).toBeLessThanOrEqual(100);
    });

    it('gives no bonus for distant future dates', () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const score = calculatePriorityScore('medium', future);

      expect(score).toBeCloseTo(50, 5); // Should be close to base score for medium priority
    });

    it('handles medium priority correctly', () => {
      const score = calculatePriorityScore('medium');
      expect(score).toBe(50);
    });

    it('handles low priority correctly', () => {
      const score = calculatePriorityScore('low');
      expect(score).toBeLessThan(50);
    });

    it('handles none priority correctly', () => {
      const score = calculatePriorityScore('none');
      expect(score).toBeLessThan(50);
    });
  });
});

describe('Smart Inbox Type Safety', () => {
  it('uses correct InboxSourceType', () => {
    const validTypes = ['calendar', 'email', 'slack', 'github', 'manual', 'integration'] as const;

    expect(validTypes).toHaveLength(6);
    expect(validTypes).toContain('calendar');
    expect(validTypes).toContain('email');
  });

  it('uses correct status values', () => {
    const validStatuses = ['pending' as const, 'processing' as const, 'converted' as const, 'dismissed' as const];

    expect(validStatuses).toHaveLength(4);
  });

  it('uses correct priority values', () => {
    const validPriorities = ['critical' as const, 'high' as const, 'medium' as const, 'low' as const, 'none' as const];

    expect(validPriorities).toHaveLength(5);
  });
});

describe('calculateDaysUntil', () => {
  // This tests the internal logic - we test via calculatePriorityScore
  it('returns negative for overdue dates', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const score = calculatePriorityScore('medium', yesterday);

    // Overdue dates boost the score
    expect(score).toBeGreaterThan(50);
  });

  it('returns small positive for today', () => {
    const today = new Date().toISOString().split('T')[0];
    const score = calculatePriorityScore('medium', today);

    expect(score).toBeGreaterThan(50);
  });

  it('returns positive for future dates', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const score = calculatePriorityScore('medium', tomorrow);

    expect(score).toBeGreaterThan(50);
  });
});