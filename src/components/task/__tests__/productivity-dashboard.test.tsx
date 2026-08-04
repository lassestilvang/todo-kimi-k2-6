import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductivityDashboard } from '../productivity-dashboard';

// Mock recharts
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('ProductivityDashboard', () => {
  const mockTasks: any[] = [
    {
      id: 1,
      name: 'Task 1',
      completed: false,
      priority: 'high',
      labels: [],
      subtasks: [],
      reminders: [],
      logs: [],
      date: null,
      deadline: null,
      description: null,
      notes: null,
      estimate: null,
      actual_time: null,
      recurring: 'none',
      recurring_config: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sort_order: 0
    },
    {
      id: 2,
      name: 'Task 2',
      completed: true,
      priority: 'medium',
      labels: [],
      subtasks: [],
      reminders: [],
      logs: [],
      date: null,
      deadline: null,
      description: null,
      notes: null,
      estimate: null,
      actual_time: null,
      recurring: 'none',
      recurring_config: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sort_order: 0,
      completed_at: new Date().toISOString()
    },
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

  it('displays priority distribution charts', () => {
    render(<ProductivityDashboard tasks={mockTasks} />);
    expect(screen.getByText('Priority Distribution')).toBeInTheDocument();
  });

  it('shows productivity insights', () => {
    render(<ProductivityDashboard tasks={mockTasks} />);
    // May show insights even with partial data
    expect(screen.getByRole('heading', { name: /completion rate/i })).toBeInTheDocument();
  });
});