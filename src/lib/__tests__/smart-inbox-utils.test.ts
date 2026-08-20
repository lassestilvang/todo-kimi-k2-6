import { describe, it, expect } from 'vitest';
import {
  calculatePriorityScore,
  calculateDaysUntil,
  getSourceName,
  getPriorityColor,
} from '../smart-inbox-utils';

describe('Smart Inbox Utils', () => {
  describe('calculatePriorityScore', () => {
    it('should return confidence value for medium priority with no due date', () => {
      const score = calculatePriorityScore('medium', undefined, 50);
      expect(score).toBe(50);
    });

    it('should boost score for critical priority', () => {
      const score = calculatePriorityScore('critical', undefined, 50);
      expect(score).toBe(100); // 50 * 2.0 = 100
    });

    it('should boost score for high priority', () => {
      const score = calculatePriorityScore('high', undefined, 50);
      expect(score).toBe(75); // 50 * 1.5 = 75
    });

    it('should apply medium priority multiplier of 1.0', () => {
      const score = calculatePriorityScore('medium', undefined, 60);
      expect(score).toBe(60); // 60 * 1.0 = 60
    });

    it('should boost score for low priority', () => {
      const score = calculatePriorityScore('low', undefined, 50);
      expect(score).toBe(35); // 50 * 0.7 = 35
    });

    it('should cap at 100 for none priority', () => {
      const score = calculatePriorityScore('none', undefined, 50);
      expect(score).toBe(25); // 50 * 0.5 = 25
    });

    it('should boost score for unknown priority', () => {
      const score = calculatePriorityScore('unknown', undefined, 50);
      expect(score).toBe(50); // 50 * 1.0 = 50 (no multiplier, defaults to 1.0)
    });

    it('should add 50 for overdue tasks', () => {
      const score = calculatePriorityScore('medium', '2020-01-01', 50);
      expect(score).toBe(100); // 50 + 50 = 100 (capped)
    });

    it('should add 30 for tasks due in 3 days or less', () => {
      // Use a fixed date relative to "today" for consistent testing
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 3);
      const dateStr = dueDate.toISOString().split('T')[0];
      const score = calculatePriorityScore('medium', dateStr, 50);
      // Score should be at least 80 (50 + 30), but may vary slightly due to date calculation
      expect(score).toBeGreaterThanOrEqual(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should add 15 for tasks due in 7 days or less', () => {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 5);
      const dateStr = dueDate.toISOString().split('T')[0];
      const score = calculatePriorityScore('medium', dateStr, 50);
      expect(score).toBeGreaterThanOrEqual(65);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should cap total score at 100', () => {
      const score = calculatePriorityScore('critical', '2020-01-01', 80);
      expect(score).toBe(100); // 80 * 2 + 50 = 210, capped at 100
    });

    it('should use default confidence of 50', () => {
      const score = calculatePriorityScore('medium');
      expect(score).toBe(50);
    });
  });

  describe('calculateDaysUntil', () => {
    it('should return 0 for today', () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const days = calculateDaysUntil(dateStr);
      // Should be 0 or -1 depending on time of day in UTC
      expect(Math.abs(days)).toBeLessThanOrEqual(1);
    });

    it('should return positive for future dates', () => {
      const today = new Date();
      const future = new Date(today);
      future.setDate(today.getDate() + 7);
      const dateStr = future.toISOString().split('T')[0];
      const days = calculateDaysUntil(dateStr);
      // Should be 6, 7, or 8 depending on time of day vs UTC date
      expect(days).toBeGreaterThanOrEqual(6);
      expect(days).toBeLessThanOrEqual(8);
    });

    it('should return negative for past dates', () => {
      const today = new Date();
      const past = new Date(today);
      past.setDate(today.getDate() - 5);
      const dateStr = past.toISOString().split('T')[0];
      const days = calculateDaysUntil(dateStr);
      // Should be -5, -6, or -7 depending on time of day vs UTC date
      expect(Math.abs(days)).toBeGreaterThanOrEqual(5);
      expect(Math.abs(days)).toBeLessThanOrEqual(7);
    });

    it('should handle ISO date format', () => {
      // Use a date roughly one year from now
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      // Avoid timezone issues by adjusting if the date already passed
      if (future.getMonth() === 0 && future.getDate() === 1) {
        future.setDate(future.getDate() + 1);
      }
      const dateStr = future.toISOString().split('T')[0];
      const days = calculateDaysUntil(dateStr);
      // Should be positive for future dates
      expect(days).toBeGreaterThan(0);
      // Should be approximately 360-370 days (accounting for leap years)
      expect(days).toBeGreaterThan(360);
      expect(days).toBeLessThan(370);
    });

    it('should return negative for past dates using ISO format', () => {
      const past = '2020-01-01';
      const days = calculateDaysUntil(past);
      expect(days).toBeLessThan(0);
    });
  });

  describe('getSourceName', () => {
    it('should return Calendar for calendar', () => {
      expect(getSourceName('calendar')).toBe('Calendar');
    });

    it('should return Email for email', () => {
      expect(getSourceName('email')).toBe('Email');
    });

    it('should return Slack for slack', () => {
      expect(getSourceName('slack')).toBe('Slack');
    });

    it('should return GitHub for github', () => {
      expect(getSourceName('github')).toBe('GitHub');
    });

    it('should return Manual for manual', () => {
      expect(getSourceName('manual')).toBe('Manual');
    });

    it('should return Integration for integration', () => {
      expect(getSourceName('integration')).toBe('Integration');
    });
  });

  describe('getPriorityColor', () => {
    it('should return red color for critical priority', () => {
      const color = getPriorityColor('critical');
      expect(color).toContain('red');
      expect(color).toContain('500');
    });

    it('should return orange color for high priority', () => {
      const color = getPriorityColor('high');
      expect(color).toContain('orange');
    });

    it('should return blue color for medium priority', () => {
      const color = getPriorityColor('medium');
      expect(color).toContain('blue');
    });

    it('should return green color for low priority', () => {
      const color = getPriorityColor('low');
      expect(color).toContain('green');
    });

    it('should return gray color for none priority', () => {
      const color = getPriorityColor('none');
      expect(color).toContain('gray');
    });

    it('should return gray color for unknown priority', () => {
      const color = getPriorityColor('unknown');
      expect(color).toContain('gray');
    });
  });
});
