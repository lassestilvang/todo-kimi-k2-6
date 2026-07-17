import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateTimeBlockedSchedule, detectScheduleConflicts, rescheduleWithBuffer, predictTaskDuration, suggestOptimalTimes } from '../scheduling';
import { setupTestDb, cleanupTestDb, createTestTasks } from '@/test/test-utils';

describe('Scheduling Actions', () => {
  beforeEach(async () => {
    await setupTestDb();
    await createTestTasks();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('generateTimeBlockedSchedule', () => {
    it('generates optimal time blocks for tasks', async () => {
      const tasks = await getTestTasks();

      const schedule = await generateTimeBlockedSchedule(tasks, {
        userId: 1,
        workHours: { start: 9, end: 17 },
        energyProfile: {
          peak_hours: [{ hour: 9, productivity_score: 95 }, { hour: 14, productivity_score: 85 }],
          energy_cycles: { morning_boost: true, afternoon_dip: true, recovery_needed: false }
        }
      });

      expect(Array.isArray(schedule)).toBe(true);
      expect(schedule.length).toBeGreaterThan(0);

      schedule.forEach(block => {
        expect(block.taskId).toBeDefined();
        expect(block.startTime).toBeDefined();
        expect(block.endTime).toBeDefined();
        expect(block.confidence).toBeGreaterThanOrEqual(0);
        expect(block.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('prioritizes critical tasks', async () => {
      const tasks = await getTestTasks();
      const criticalTasks = tasks.filter(t => t.priority === 'critical');

      const schedule = await generateTimeBlockedSchedule(criticalTasks, {
        userId: 1,
        workHours: { start: 9, end: 17 }
      });

      expect(schedule.length).toBe(criticalTasks.length);
    });
  });

  describe('detectScheduleConflicts', () => {
    it('detects time overlaps between tasks', async () => {
      const tasks = [
        { id: 1, name: 'Task 1', date: '2024-01-15', estimate: '1:00', priority: 'high' },
        { id: 2, name: 'Task 2', date: '2024-01-15', estimate: '1:00', priority: 'medium' }
      ];

      const existingSchedule = [
        { taskId: 1, startTime: '09:00', endTime: '11:00' },
        { taskId: 2, startTime: '10:30', endTime: '12:30' } // Overlaps with task 1
      ];

      const { conflicts, suggestions } = await detectScheduleConflicts(tasks, existingSchedule);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('returns no conflicts for non-overlapping schedules', async () => {
      const tasks = [];
      const existingSchedule = [];

      const { conflicts } = await detectScheduleConflicts(tasks, existingSchedule);

      expect(conflicts).toEqual([]);
    });
  });

  describe('rescheduleWithBuffer', () => {
    it('adds buffer time between tasks', async () => {
      const tasks = await getTestTasks();
      const bufferMinutes = 15;

      const scheduledTasks = await rescheduleWithBuffer(tasks, bufferMinutes, {
        workHours: { start: 9, end: 17 }
      });

      expect(Array.isArray(scheduledTasks)).toBe(true);
      scheduledTasks.forEach(task => {
        expect(task.bufferMinutes).toBe(bufferMinutes);
      });
    });
  });

  describe('predictTaskDuration', () => {
    it('predicts realistic task duration', async () => {
      const task = {
        id: 1,
        name: 'Design homepage mockup',
        description: 'Create wireframes for new homepage design',
        priority: 'high' as const,
        completed: false,
        date: null,
        deadline: null,
        labels: [],
        subtasks: [],
        time_entries: [],
        logs: [],
        comments: [],
        attachments: [],
        blockers: [],
        blocked_by: [],
        list_id: 1,
        recurring: 'none',
        recurring_config: null,
        recurring_exceptions: [],
        estimate: null,
        actual_time: null
      };

      const prediction = await predictTaskDuration(task, { userId: 1 });

      expect(prediction).toBeDefined();
      expect(prediction.estimated_duration).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('suggestOptimalTimes', () => {
    it('suggests multiple optimal time slots', async () => {
      const scheduleSuggestions = await suggestOptimalTimes(1, {
        userId: 1,
        energyProfile: {
          peak_hours: [
            { hour: 9, productivity_score: 95 },
            { hour: 10, productivity_score: 92 },
            { hour: 14, productivity_score: 88 }
          ]
        }
      });

      expect(Array.isArray(scheduleSuggestions)).toBe(true);
      expect(scheduleSuggestions.length).toBeGreaterThan(0);

      scheduleSuggestions.forEach(suggestion => {
        expect(suggestion.time).toBeDefined();
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.reason).toBeDefined();
      });
    });
  });
});

// Helper functions
async function getTestTasks() {
  return [
    { id: 1, name: 'Design homepage', priority: 'critical', completed: false, time_entries: [] },
    { id: 2, name: 'Write documentation', priority: 'high', completed: false, time_entries: [] },
    { id: 3, name: 'Code review', priority: 'medium', completed: false, time_entries: [] }
  ];
}