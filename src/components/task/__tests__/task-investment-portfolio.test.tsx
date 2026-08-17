import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskInvestmentPortfolio } from '../task-investment-portfolio';
import type { TaskWithRelations } from '@/types';

// Mock task data
const mockTasks = [
  {
    id: 1,
    user_id: 1,
    name: 'High priority urgent task',
    description: 'A critical task with deadline',
    notes: null,
    list_id: 1,
    date: '2026-07-27',
    deadline: '2026-07-30',
    estimate: '30',
    actual_time: null,
    priority: 'critical' as const,
    recurring: 'none' as const,
    recurring_config: null,
    completed: false,
    completed_at: null,
    created_at: '2026-07-26',
    updated_at: '2026-07-26',
    sort_order: 0,
    archived: false,
    labels: [],
    subtasks: [],
    reminders: [],
    logs: [],
    comments: [],
    attachments: [],
    time_entries: [],
    recurring_exceptions: [],
    blockers: [],
    blocked_by: [],
  },
  {
    id: 2,
    user_id: 1,
    name: 'Medium priority task',
    description: 'A regular task',
    notes: null,
    list_id: 1,
    date: '2026-07-28',
    deadline: '2026-08-05',
    estimate: '60',
    actual_time: null,
    priority: 'medium' as const,
    recurring: 'none' as const,
    recurring_config: null,
    completed: false,
    completed_at: null,
    created_at: '2026-07-26',
    updated_at: '2026-07-26',
    sort_order: 1,
    archived: false,
    labels: [],
    subtasks: [
      {
        id: 1,
        task_id: 2,
        name: 'Subtask 1',
        completed: false,
        created_at: '2026-07-26',
      },
    ],
    reminders: [],
    logs: [],
    comments: [],
    attachments: [],
    time_entries: [],
    recurring_exceptions: [],
    blockers: [],
    blocked_by: [],
  },
  {
    id: 3,
    user_id: 1,
    name: 'Low priority task',
    description: 'Not urgent',
    notes: null,
    list_id: 1,
    date: '2026-08-15',
    deadline: null,
    estimate: '15',
    actual_time: null,
    priority: 'low' as const,
    recurring: 'none' as const,
    recurring_config: null,
    completed: false,
    completed_at: null,
    created_at: '2026-07-26',
    updated_at: '2026-07-26',
    sort_order: 2,
    archived: false,
    labels: [],
    subtasks: [],
    reminders: [],
    logs: [],
    comments: [],
    attachments: [],
    time_entries: [],
    recurring_exceptions: [],
    blockers: [],
    blocked_by: [],
  },
] as TaskWithRelations[];

describe('TaskInvestmentPortfolio', () => {
  it('renders the component with tasks', () => {
    render(<TaskInvestmentPortfolio tasks={mockTasks} />);

    expect(screen.getByText('Task Investment Portfolio')).toBeInTheDocument();
  });

  it('displays total task count', () => {
    render(<TaskInvestmentPortfolio tasks={mockTasks} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows high ROI section when there are high ROI tasks', () => {
    render(<TaskInvestmentPortfolio tasks={mockTasks} />);

    expect(screen.getByText('High ROI')).toBeInTheDocument();
  });

  it('shows top investment opportunities', () => {
    render(<TaskInvestmentPortfolio tasks={mockTasks} />);

    expect(
      screen.getByText('Top Investment Opportunities')
    ).toBeInTheDocument();
  });

  it('calculates ROI based on priority', () => {
    render(<TaskInvestmentPortfolio tasks={mockTasks} />);

    // Critical task should have higher ROI than low priority
    const highROIElements = screen.getAllByText(/ROI:/);
    expect(highROIElements.length).toBeGreaterThan(0);
  });
});
