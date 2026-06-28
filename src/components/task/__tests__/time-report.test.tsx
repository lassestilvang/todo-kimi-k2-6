import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeReport } from '../time-report';

// Mock recharts
vi.mock('recharts', () => ({
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  LineChart: () => null,
  Line: () => null,
  CartesianGrid: () => null,
}));

describe('TimeReport', () => {
  const mockTasks: any[] = [
    { id: 1, name: 'Task 1', completed: false, priority: 'high', labels: [], subtasks: [], reminders: [], logs: [], date: null, deadline: null, description: null, notes: null, estimate: null, actual_time: null, recurring: 'none', recurring_config: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sort_order: 0 },
    { id: 2, name: 'Task 2', completed: true, priority: 'medium', labels: [], subtasks: [], reminders: [], logs: [], date: null, deadline: null, description: null, notes: null, estimate: null, actual_time: null, recurring: 'none', recurring_config: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sort_order: 0, completed_at: new Date().toISOString() },
  ];

  // Use dates within the current week for proper filtering
  const mockTimeEntries = [
    { id: 1, task_id: 1, start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_seconds: 3600, description: 'Test task 1' },
    { id: 2, task_id: 2, start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_seconds: 1800, description: 'Test task 2' },
  ];

  it('renders time report with data', () => {
    render(<TimeReport tasks={mockTasks} timeEntries={mockTimeEntries} />);
    expect(screen.getByText('Total Time')).toBeInTheDocument();
  });

  it('displays total time correctly', () => {
    render(<TimeReport tasks={mockTasks} timeEntries={mockTimeEntries} />);
    // 3600 + 1800 seconds = 5400 seconds = 90 minutes
    expect(screen.getByText('90m')).toBeInTheDocument();
  });

  it('displays period selector', () => {
    render(<TimeReport tasks={mockTasks} timeEntries={mockTimeEntries} />);
    expect(screen.getByText('This Week')).toBeInTheDocument();
  });
});