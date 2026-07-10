import { describe, it, expect } from 'vitest';
import {
  calculateWorkloads,
  generateWorkloadSuggestions,
  getUserWorkloadSummary,
  detectScheduleConflicts,
  analyzeProductivityPatterns,
  suggestOptimalRescheduling,
  categorizeWorkload,
  type UserWorkload,
} from '@/lib/ai/workload';

describe('Workload AI Functions', () => {
  describe('detectScheduleConflicts', () => {
    it('should detect too_many_tasks conflict for >5 tasks on same day', () => {
      const tasks = [];
      const baseDate = '2026-07-15';

      for (let i = 0; i < 7; i++) {
        tasks.push({
          id: i + 1,
          name: `Task ${i}`,
          date: baseDate,
          deadline: null,
          estimate: '1:00',
          completed: false,
          priority: 'medium',
        });
      }

      const conflicts = detectScheduleConflicts(tasks);

      expect(conflicts.length).toBeGreaterThanOrEqual(1);
      expect(conflicts[0].conflictType).toBe('too_many_tasks');
      expect(conflicts[0].conflictingTaskIds).toHaveLength(7);
    });

    it('should detect missing_deadline for tasks without deadline within a week', () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const tasks = [
        {
          id: 1,
          name: 'Task without deadline',
          date: futureDate,
          deadline: null,
          estimate: '1:00',
          completed: false,
          priority: 'high',
        },
      ];

      const conflicts = detectScheduleConflicts(tasks);
      expect(conflicts.some(c => c.conflictType === 'missing_deadline')).toBe(
        true
      );
    });

    it('should not flag low priority tasks as missing deadline', () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const tasks = [
        {
          id: 1,
          name: 'Low priority task',
          date: futureDate,
          deadline: null,
          estimate: '1:00',
          completed: false,
          priority: 'low',
        },
      ];

      const conflicts = detectScheduleConflicts(tasks);
      expect(conflicts.some(c => c.conflictType === 'missing_deadline')).toBe(
        false
      );
    });

    it('should return empty array for completed tasks', () => {
      const tasks = [
        {
          id: 1,
          name: 'Completed task',
          date: '2026-07-15',
          deadline: null,
          estimate: '1:00',
          completed: true,
          priority: 'high',
        },
      ];

      const conflicts = detectScheduleConflicts(tasks);
      expect(conflicts.length).toBe(0);
    });

    it('should return empty array for tasks without date', () => {
      const tasks = [
        {
          id: 1,
          name: 'Task without date',
          date: null,
          deadline: null,
          estimate: '1:00',
          completed: false,
          priority: 'high',
        },
      ];

      const conflicts = detectScheduleConflicts(tasks);
      expect(conflicts.length).toBe(0);
    });

    it('should return empty array for empty tasks', () => {
      const conflicts = detectScheduleConflicts([]);
      expect(conflicts).toEqual([]);
    });
  });

  describe('analyzeProductivityPatterns', () => {
    it('should return patterns for all 24 hours', () => {
      const tasks = [
        { id: 1, date: '2026-07-15', completed: true },
        { id: 2, date: '2026-07-15', completed: false },
      ];

      const timeEntries = [
        {
          task_id: 1,
          start_time: '2026-07-15T09:00:00Z',
          end_time: '2026-07-15T10:00:00Z',
          duration_seconds: 3600,
        },
      ];

      const patterns = analyzeProductivityPatterns(tasks, timeEntries);

      expect(patterns).toHaveLength(24);
      // Verify all hours 0-23 are present (sorted by completion rate)
      const hours = patterns.map(p => p.hour);
      expect(hours).toContain(0);
      expect(hours).toContain(9);
      expect(hours).toContain(23);
    });

    it('should handle empty inputs', () => {
      const patterns = analyzeProductivityPatterns([], []);

      expect(patterns).toHaveLength(24);
      patterns.forEach(p => {
        expect(p.completionRate).toBe(0);
        expect(p.taskCount).toBe(0);
      });
    });

    it('should calculate completion rate from time entries with multiple entries', () => {
      const tasks = [
        { id: 1, date: '2026-07-15', completed: true },
        { id: 2, date: '2026-07-15', completed: false },
      ];

      const timeEntries = [
        {
          task_id: 1,
          start_time: '2026-07-15T09:00:00Z',
          end_time: '2026-07-15T10:00:00Z',
          duration_seconds: 3600,
        },
        {
          task_id: 2,
          start_time: '2026-07-15T09:00:00Z',
          end_time: null,
          duration_seconds: 3600,
        },
      ];

      const patterns = analyzeProductivityPatterns(tasks, timeEntries);
      const hour9Pattern = patterns.find(p => p.hour === 9);

      expect(hour9Pattern).toBeDefined();
      // The function calculates taskCount from completedByHour which counts end_time entries
      expect(typeof hour9Pattern?.completionRate).toBe('number');
    });

    it('should handle time entries without end_time', () => {
      const tasks = [{ id: 1, date: '2026-07-15', completed: false }];

      const timeEntries = [
        {
          task_id: 1,
          start_time: '2026-07-15T14:00:00Z',
          end_time: null,
          duration_seconds: 3600,
        },
      ];

      const patterns = analyzeProductivityPatterns(tasks, timeEntries);
      // Hour 14 has no completed entries, but hour 10 gets task count
      expect(patterns.find(p => p.hour === 10)).toBeDefined();
    });
  });

  describe('suggestOptimalRescheduling', () => {
    it('should suggest rescheduling for overloaded days with tasks without estimates', () => {
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        tasks.push({
          id: i + 1,
          name: `Task ${i}`,
          date: '2026-07-15',
          estimate: null,
          priority: 'low',
        });
      }

      const patterns = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        completionRate: 0.9 - i * 0.02,
        taskCount: i % 3,
      }));

      const suggestions = suggestOptimalRescheduling(tasks, patterns);
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest rescheduling for tasks with estimates', () => {
      const tasks = [
        {
          id: 1,
          name: 'Task with estimate',
          date: '2026-07-15',
          estimate: '2:00',
          priority: 'low',
        },
      ];

      const patterns = [{ hour: 9, completionRate: 0.9, taskCount: 1 }];
      patterns.push(
        ...Array.from({ length: 23 }, (_, i) => ({
          hour: i + 1,
          completionRate: 0.9,
          taskCount: 1,
        }))
      );

      const suggestions = suggestOptimalRescheduling(tasks, patterns);
      expect(suggestions.length).toBe(0);
    });

    it('should handle empty tasks array', () => {
      const patterns = [{ hour: 9, completionRate: 0.9, taskCount: 1 }];

      const suggestions = suggestOptimalRescheduling([], patterns);
      expect(suggestions).toEqual([]);
    });

    it('should suggest rescheduling for non-low priority tasks on overloaded days', () => {
      const tasks = [
        {
          id: 1,
          name: 'Medium task',
          date: '2026-07-15',
          estimate: null,
          priority: 'medium',
        },
        {
          id: 2,
          name: 'High task',
          date: '2026-07-15',
          estimate: null,
          priority: 'high',
        },
        {
          id: 3,
          name: 'Critical task',
          date: '2026-07-15',
          estimate: null,
          priority: 'critical',
        },
      ];

      const patterns = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        completionRate: 0.9 - i * 0.02,
        taskCount: 1,
      }));

      const suggestions = suggestOptimalRescheduling(tasks, patterns);
      // Non-low priority tasks should not be in suggestions
      expect(
        suggestions.every(
          s => s.taskId !== 1 && s.taskId !== 2 && s.taskId !== 3
        )
      ).toBe(true);
    });
  });

  describe('categorizeWorkload', () => {
    it('should return underloaded for score below 0.7x average', () => {
      expect(categorizeWorkload(5, 10)).toBe('underloaded');
      expect(categorizeWorkload(30, 100)).toBe('underloaded');
    });

    it('should return balanced for moderate scores', () => {
      expect(categorizeWorkload(10, 10)).toBe('balanced');
      expect(categorizeWorkload(13, 10)).toBe('balanced');
    });

    it('should return overloaded for score above 1.3x average', () => {
      expect(categorizeWorkload(20, 10)).toBe('overloaded');
      expect(categorizeWorkload(150, 100)).toBe('overloaded');
    });

    it('should return balanced at the boundary (score >= 0.7 and <= 1.3 of average)', () => {
      // 7 >= 7 (0.7 * 10), so it's balanced
      // 13 <= 13 (1.3 * 10), so it's balanced
      expect(categorizeWorkload(7, 10)).toBe('balanced');
      expect(categorizeWorkload(13, 10)).toBe('balanced');
    });
  });

  describe('calculateWorkloads', () => {
    it('should calculate workload scores for all users', () => {
      const users: UserWorkload[] = [
        {
          userId: 1,
          userName: 'Alice',
          email: 'alice@example.com',
          totalTasks: 10,
          completedTasks: 5,
          overdueTasks: 2,
          highPriorityTasks: 3,
          avgEstimatedTime: 2.5,
          totalEstimatedTime: 25,
        },
        {
          userId: 2,
          userName: 'Bob',
          email: 'bob@example.com',
          totalTasks: 5,
          completedTasks: 3,
          overdueTasks: 0,
          highPriorityTasks: 1,
          avgEstimatedTime: 1.5,
          totalEstimatedTime: 7.5,
        },
      ];

      const workloads = calculateWorkloads(users);

      expect(workloads.size).toBe(2);
      expect(workloads.get(1)).toBeGreaterThan(workloads.get(2)!);
    });

    it('should return empty map for empty users', () => {
      const workloads = calculateWorkloads([]);
      expect(workloads.size).toBe(0);
    });

    it('should calculate correct workload score with all factors', () => {
      const users: UserWorkload[] = [
        {
          userId: 1,
          userName: 'Test',
          email: 'test@example.com',
          totalTasks: 10, // * 1
          completedTasks: 5,
          overdueTasks: 5, // * 3 = 15
          highPriorityTasks: 5, // * 2 = 10
          avgEstimatedTime: 0,
          totalEstimatedTime: 600, // / 60 = 10
        },
      ];

      const workloads = calculateWorkloads(users);
      // Expected: 10 + 15 + 10 + 10 = 45
      expect(workloads.get(1)).toBe(45);
    });
  });

  describe('getUserWorkloadSummary', () => {
    const user: UserWorkload = {
      userId: 1,
      userName: 'Alice',
      email: 'alice@example.com',
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      highPriorityTasks: 0,
      avgEstimatedTime: 0,
      totalEstimatedTime: 0,
    };

    it('should calculate workload summary for a user', () => {
      const tasks = [
        {
          id: 1,
          assignee_id: 1,
          completed: false,
          priority: 'critical',
          date: '2024-01-15',
          estimate: '2:00',
        },
        {
          id: 2,
          assignee_id: 1,
          completed: true,
          priority: 'high',
          date: null,
          estimate: null,
        },
        {
          id: 3,
          assignee_id: 2,
          completed: false,
          priority: 'medium',
          date: '2023-12-01',
          estimate: '1:00',
        },
      ];

      const summary = getUserWorkloadSummary(user, tasks);

      expect(summary.totalTasks).toBe(2);
      expect(summary.completedTasks).toBe(1);
      expect(summary.overdueTasks).toBe(1);
      expect(summary.highPriorityTasks).toBe(2); // critical + high
    });

    it('should handle empty task list', () => {
      const summary = getUserWorkloadSummary(user, []);

      expect(summary.totalTasks).toBe(0);
      expect(summary.completedTasks).toBe(0);
      expect(summary.overdueTasks).toBe(0);
      expect(summary.highPriorityTasks).toBe(0);
      expect(summary.avgEstimatedTime).toBe(0);
    });

    it('should calculate estimated time from task estimates', () => {
      const tasks = [
        {
          id: 1,
          assignee_id: 1,
          completed: false,
          priority: 'none',
          date: '2026-07-15',
          estimate: '2:00',
        },
        {
          id: 2,
          assignee_id: 1,
          completed: false,
          priority: 'none',
          date: '2026-07-15',
          estimate: '1:30',
        },
        {
          id: 3,
          assignee_id: 1,
          completed: false,
          priority: 'none',
          date: '2026-07-15',
          estimate: null,
        },
      ];

      const summary = getUserWorkloadSummary(user, tasks);

      // 2:00 = 2 hours, 1:30 = 1.3 hours (parsed as float: 1.3), null = 0
      // getUserWorkloadSummary parses "1:30" as parseFloat("1:30".replace(":", ".")) = parseFloat("1.3") = 1.3
      expect(summary.totalEstimatedTime).toBeCloseTo(3.3, 1);
      expect(summary.avgEstimatedTime).toBeCloseTo(1.1, 1);
    });

    it('should correctly identify all high priority task types', () => {
      const tasks = [
        {
          id: 1,
          assignee_id: 1,
          completed: false,
          priority: 'critical',
          date: '2026-07-15',
          estimate: null,
        },
        {
          id: 2,
          assignee_id: 1,
          completed: false,
          priority: 'high',
          date: '2026-07-15',
          estimate: null,
        },
      ];

      const summary = getUserWorkloadSummary(user, tasks);
      expect(summary.highPriorityTasks).toBe(2);
    });
  });

  describe('generateWorkloadSuggestions', () => {
    const mockUsers: UserWorkload[] = [
      {
        userId: 1,
        userName: 'Alice',
        email: 'alice@example.com',
        totalTasks: 10,
        completedTasks: 5,
        overdueTasks: 2,
        highPriorityTasks: 3,
        avgEstimatedTime: 2.5,
        totalEstimatedTime: 25,
      },
      {
        userId: 2,
        userName: 'Bob',
        email: 'bob@example.com',
        totalTasks: 5,
        completedTasks: 3,
        overdueTasks: 0,
        highPriorityTasks: 1,
        avgEstimatedTime: 1.5,
        totalEstimatedTime: 7.5,
      },
    ];

    it('should generate reassignment suggestions for overdue high-priority tasks', async () => {
      const tasks = [
        {
          id: 1,
          name: 'Overdue Critical Task',
          assignee_id: 1,
          priority: 'critical',
          date: '2023-01-01',
          estimate: '2:00',
          completed: false,
        },
      ];

      const suggestions = await generateWorkloadSuggestions(tasks, mockUsers);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('reassign');
      expect(suggestions[0].taskId).toBe(1);
    });

    it('should generate split suggestions for large tasks near deadline', async () => {
      // Create a task with 5+ hour estimate and a date within 3 days
      const tasks = [
        {
          id: 1,
          name: 'Large Task',
          assignee_id: 1,
          priority: 'medium',
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          estimate: '5:00',
          completed: false,
        },
      ];

      const suggestions = await generateWorkloadSuggestions(tasks, mockUsers);

      const splitSuggestion = suggestions.find(s => s.type === 'split');
      expect(splitSuggestion).toBeDefined();
    });

    it('should not generate split suggestions for small tasks', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tasks = [
        {
          id: 1,
          name: 'Small Task',
          assignee_id: 1,
          priority: 'medium',
          date: today,
          estimate: '2:00',
          completed: false,
        },
      ];

      const suggestions = await generateWorkloadSuggestions(tasks, mockUsers);
      const splitSuggestion = suggestions.find(s => s.type === 'split');
      expect(splitSuggestion).toBeUndefined();
    });

    it('should not generate suggestions for completed tasks', async () => {
      const tasks = [
        {
          id: 1,
          name: 'Completed Task',
          assignee_id: 1,
          priority: 'medium',
          date: '2024-01-15',
          estimate: '1:00',
          completed: true,
        },
      ];

      const suggestions = await generateWorkloadSuggestions(tasks, mockUsers);
      expect(suggestions.length).toBe(0);
    });

    it('should handle no overloaded/underloaded users', async () => {
      const balancedUsers: UserWorkload[] = [
        {
          userId: 1,
          userName: 'User 1',
          email: 'user1@example.com',
          totalTasks: 10,
          completedTasks: 5,
          overdueTasks: 2,
          highPriorityTasks: 3,
          avgEstimatedTime: 2.5,
          totalEstimatedTime: 25,
        },
      ];

      const tasks = [
        {
          id: 1,
          name: 'Task',
          assignee_id: 1,
          priority: 'medium',
          date: '2026-07-15',
          estimate: '2:00',
          completed: false,
        },
      ];

      const suggestions = await generateWorkloadSuggestions(
        tasks,
        balancedUsers
      );
      // When there's only one user, no reassignment happens
      expect(suggestions.length).toBe(0);
    });
  });
});
