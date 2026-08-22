import { describe, it, expect } from 'vitest';
import {
  calculateTaskHealth,
  getHealthStatusColor,
  getHealthStatusEmoji,
} from './task-health';

describe('Task Health Score', () => {
  it('should calculate a high health score for critical task due today', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const task = {
      priority: 'critical',
      deadline: tomorrow,
      estimate: '2:00',
      date: new Date().toISOString().split('T')[0],
      completed: false,
      description: 'Important task',
      name: 'Test task',
    };

    const result = calculateTaskHealth(task);

    expect(result.priorityScore).toBe(40);
    expect(result.deadlineScore).toBe(25); // Due tomorrow = 1-2 days
    // Total = 40 + 25 + 15 + 7 = 87 (critical + due tomorrow + 2h estimate + short desc)
    expect(result.totalScore).toBe(87);
    expect(result.status).toBe('healthy');
    expect(getHealthStatusEmoji(result.status)).toBe('✅');
  });

  it('should calculate low health score for overdue task', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const task = {
      priority: 'low',
      deadline: yesterday,
      estimate: null,
      date: yesterday,
      completed: false,
      description: null,
      name: 'Overdue task',
    };

    const result = calculateTaskHealth(task);

    expect(result.status).toBe('overdue');
    expect(result.factors.some(f => f.reason?.includes('overdue'))).toBe(true);
  });

  it('should penalize blocked tasks in importance score', () => {
    const task = {
      priority: 'medium',
      deadline: null,
      estimate: null,
      date: new Date().toISOString().split('T')[0],
      completed: false,
      description: null,
      name: 'Blocked task',
      blocked_by: [{ id: 1 }],
    };

    const result = calculateTaskHealth(task);

    expect(result.importanceScore).toBeLessThan(10);
    expect(result.factors.find(f => f.name === 'Importance')?.reason).toBe(
      'Blocked by other tasks'
    );
  });

  it('should give bonus for well-described tasks', () => {
    const task = {
      priority: 'medium',
      deadline: null,
      estimate: null,
      date: null,
      completed: false,
      description:
        'This is a detailed description that explains the task thoroughly and provides context for the user to understand what needs to be done in detail.',
      name: 'Well described task',
    };

    const result = calculateTaskHealth(task);

    // Description > 100 chars gets bonus points
    expect(result.importanceScore).toBe(10);
    expect(result.factors.find(f => f.name === 'Importance')?.reason).toBe(
      'Well described task'
    );
  });

  it('should calculate effort score based on estimate', () => {
    const smallTask = {
      priority: 'medium',
      deadline: null,
      estimate: '1:00',
      date: null,
      completed: false,
      description: null,
      name: 'Small task',
    };

    const largeTask = {
      priority: 'medium',
      deadline: null,
      estimate: '10:00',
      date: null,
      completed: false,
      description: null,
      name: 'Large task',
    };

    const smallResult = calculateTaskHealth(smallTask);
    const largeResult = calculateTaskHealth(largeTask);

    expect(smallResult.effortScore).toBeGreaterThan(largeResult.effortScore);
  });

  it('should return healthy status for completed tasks', () => {
    const task = {
      priority: 'critical',
      deadline: new Date().toISOString().split('T')[0],
      estimate: '10:00',
      date: new Date().toISOString().split('T')[0],
      completed: true,
      description: null,
      name: 'Completed task',
      blocked_by: [{ id: 1 }],
    };

    const result = calculateTaskHealth(task);

    expect(result.status).toBe('healthy');
  });

  it('should calculate attention status for medium priority task due soon', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const task = {
      priority: 'high',
      deadline: tomorrow,
      estimate: '2:00',
      date: tomorrow,
      completed: false,
      description:
        'This is a very detailed description that exceeds one hundred characters for proper scoring in the health calculation algorithm',
      name: 'Task due tomorrow',
    };

    const result = calculateTaskHealth(task);

    // Total = 30 + 25 + 15 + 10 = 80
    expect(result.priorityScore).toBe(30);
    expect(result.deadlineScore).toBe(25);
    expect(result.effortScore).toBe(15);
    expect(result.importanceScore).toBe(10);
    expect(result.totalScore).toBe(80);
    expect(result.status).toBe('healthy');
  });

  it('should handle overdue tasks correctly', () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const task = {
      priority: 'high',
      deadline: pastDate,
      estimate: '1:00',
      date: pastDate,
      completed: false,
      description: 'Overdue task',
      name: 'Overdue task',
    };

    const result = calculateTaskHealth(task);

    // Overdue tasks get low deadline score (5) and overdue status
    expect(result.deadlineScore).toBe(5);
    expect(result.status).toBe('overdue');
  });

  it('should handle tasks without deadlines', () => {
    const task = {
      priority: 'medium',
      deadline: null,
      estimate: null,
      date: null,
      completed: false,
      description: null,
      name: 'Task without deadline',
    };

    const result = calculateTaskHealth(task);

    // Total = 20 + 15 + 10 + 4 = 49 (medium priority, no deadline, no estimate, no description)
    expect(result.deadlineScore).toBe(15);
    expect(result.totalScore).toBe(49);
    expect(result.status).toBe('attention'); // 40-79 is attention
  });
});

describe('Health Status Colors', () => {
  it('should return correct color classes for each status', () => {
    expect(getHealthStatusColor('healthy')).toContain('green');
    expect(getHealthStatusColor('attention')).toContain('amber');
    expect(getHealthStatusColor('critical')).toContain('red');
    expect(getHealthStatusColor('overdue')).toContain('red');
  });
});
