import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductivityDashboard } from '../productivity-dashboard';

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
  LineChart: () => null,
  Line: () => null,
  CartesianGrid: () => null,
}));

describe('ProductivityDashboard', () => {
  const mockTasks: any[] = [
    { id: 1, name: 'Task 1', completed: false, priority: 'high', labels: [], subtasks: [], reminders: [], logs: [], date: null, deadline: null, description: null, notes: null, estimate: null, actual_time: null, recurring: 'none', recurring_config: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sort_order: 0 },
    { id: 2, name: 'Task 2', completed: true, priority: 'medium', labels: [], subtasks: [], reminders: [], logs: [], date: null, deadline: null, description: null, notes: null, estimate: null, actual_time: null, recurring: 'none', recurring_config: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sort_order: 0, completed_at: new Date().toISOString() },
  ];

  it('renders productivity dashboard', () => {
    render(<ProductivityDashboard tasks={mockTasks} />);
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
  });

  it('displays completion rate', () => {
    render(<ProductivityDashboard tasks={mockTasks} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays streak section', () => {
    render(<ProductivityDashboard tasks={mockTasks} />);
    expect(screen.getByText('30-Day Streak')).toBeInTheDocument();
  });

  it('displays weekly goal', () => {
    render(<ProductivityDashboard tasks={mockTasks} />);
    expect(screen.getByText('Weekly Goal')).toBeInTheDocument();
  });
});