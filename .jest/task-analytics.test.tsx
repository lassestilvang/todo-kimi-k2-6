import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { TaskAnalytics } from '@/components/task/task-analytics';
import type { TaskWithRelations } from '@/types';

describe('TaskAnalytics', () => {
  const createMockTask = (overrides: Partial<TaskWithRelations> = {}): TaskWithRelations => ({
    id: 1,
    name: 'Test Task',
    description: null,
    list_id: 1,
    date: null,
    deadline: null,
    estimate: null,
    actual_time: null,
    priority: 'none',
    recurring: 'none',
    recurring_config: null,
    completed: 0,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    sort_order: 0,
    labels: [],
    subtasks: [],
    reminders: [],
    logs: [],
    ...overrides,
  });

  it('should render analytics header', () => {
    render(<TaskAnalytics tasks={[]} completedTasks={[]} />);
    expect(screen.getByText('Task Analytics')).toBeInTheDocument();
  });

  it('should render completion trend section', () => {
    render(<TaskAnalytics tasks={[]} completedTasks={[]} />);
    expect(screen.getByText('Completion Trend (7d)')).toBeInTheDocument();
  });

  it('should render priority distribution section', () => {
    render(<TaskAnalytics tasks={[]} completedTasks={[]} />);
    expect(screen.getByText('Priority Distribution')).toBeInTheDocument();
  });

  it('should render time tracking section', () => {
    render(<TaskAnalytics tasks={[]} completedTasks={[]} />);
    expect(screen.getByText('Time Tracking')).toBeInTheDocument();
  });

  it('should render overall completion rate', () => {
    render(<TaskAnalytics tasks={[]} completedTasks={[]} />);
    expect(screen.getByText('Overall Completion')).toBeInTheDocument();
  });

  it('should handle tasks with time entries', () => {
    const tasks = [
      createMockTask({
        id: 1,
        time_entries: [
          { id: 1, task_id: 1, start_time: '2026-01-01T09:00:00Z', end_time: '2026-01-01T10:00:00Z', duration_seconds: 3600, description: 'Work', created_at: '2026-01-01T09:00:00Z' }
        ]
      })
    ];
    render(<TaskAnalytics tasks={tasks} completedTasks={[]} />);
    expect(screen.getByText('Time Tracking')).toBeInTheDocument();
  });
});