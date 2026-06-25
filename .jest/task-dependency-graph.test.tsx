import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { TaskDependencyGraph } from '@/components/task/task-dependency-graph';
import type { TaskWithRelations } from '@/types';

describe('TaskDependencyGraph', () => {
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
    completed: false,
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

  it('should render empty state when no tasks', () => {
    render(<TaskDependencyGraph tasks={[]} onTaskClick={() => {}} />);
    expect(screen.getByText('No tasks to display')).toBeInTheDocument();
  });

  it('should render header with task count', () => {
    const tasks = [
      createMockTask({ id: 1, blocked_by: [{ id: 1, task_id: 1, depends_on_task_id: 2, created_at: '2026-01-01' }] }),
    ];
    render(<TaskDependencyGraph tasks={tasks} onTaskClick={() => {}} />);
    expect(screen.getByText('Task Dependencies')).toBeInTheDocument();
  });

  it('should show no blocked tasks message when no dependencies', () => {
    const tasks = [createMockTask({ id: 1 })];
    render(<TaskDependencyGraph tasks={tasks} onTaskClick={() => {}} />);
    expect(screen.getByText('No blocked tasks')).toBeInTheDocument();
  });

  it('should show blocked tasks count', () => {
    const tasks = [
      createMockTask({
        id: 1,
        blocked_by: [
          { id: 1, task_id: 1, depends_on_task_id: 2, created_at: '2026-01-01' }
        ]
      }),
    ];
    render(<TaskDependencyGraph tasks={tasks} onTaskClick={() => {}} />);
    expect(screen.getByText(/blocked task/)).toBeInTheDocument();
  });
});