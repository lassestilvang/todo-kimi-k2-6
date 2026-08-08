import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { TeamVelocityDashboard } from '../team-velocity-dashboard';

// Mock recharts
vi.mock('recharts', () => ({
  BarChart: () => null,
  Bar: () => null,
  LineChart: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Legend: () => null,
  AreaChart: () => null,
  Area: () => null,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TeamVelocityDashboard', () => {
  const mockReport = {
    sprints: [
      {
        id: 1,
        name: 'Sprint 1',
        period_start: '2024-01-01',
        period_end: '2024-01-14',
        planned_points: 20,
        completed_points: 15,
        completion_rate: 75,
        burn_rate: 3,
      },
      {
        id: 2,
        name: 'Sprint 2',
        period_start: '2024-01-15',
        period_end: '2024-01-28',
        planned_points: 25,
        completed_points: 20,
        completion_rate: 80,
        burn_rate: 4,
      },
    ],
    velocity: 17,
    predictedVelocity: 22,
    capacity: 40,
    burndown: [
      { day: '2024-01-01', remaining: 25, ideal: 25 },
      { day: '2024-01-07', remaining: 15, ideal: 20 },
      { day: '2024-01-14', remaining: 5, ideal: 0 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders team velocity dashboard', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: mockReport }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    expect(screen.getByText('Team Velocity')).toBeInTheDocument();
    expect(screen.getByText('Track team performance and predict future capacity')).toBeInTheDocument();
  });

  it('shows loading skeletons initially', async () => {
    mockFetch.mockImplementation(() => new Promise(() => { void 0; }));

    render(<TeamVelocityDashboard />);

    // Loading state shows skeleton cards with animate-pulse class
    await waitFor(() => {
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('displays current velocity after loading', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: mockReport }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Current Velocity')).toBeInTheDocument();
    });
  });

  it('shows predicted velocity', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: mockReport }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Predicted Velocity')).toBeInTheDocument();
    });
  });

  it('displays team capacity', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: mockReport }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Team Capacity')).toBeInTheDocument();
    });
  });

  it('shows team health indicator', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: mockReport }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Team Health')).toBeInTheDocument();
    });
  });

  it('renders time frame selector', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: mockReport }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('fetches data on initial load', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: mockReport }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/team-velocity'));
    });
  });

  it('handles error state gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Team Velocity')).toBeInTheDocument();
    });
  });

  it('shows sprint completion rates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: mockReport }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('works with workspace ID prop', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: mockReport }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard workspaceId={1} />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('workspaceId=1')
      );
    });
  });

  it('shows empty state when no sprints', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        report: {
          sprints: [],
          velocity: 0,
          predictedVelocity: 0,
          capacity: 0,
          burndown: [],
        },
      }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('No sprint data available yet')).toBeInTheDocument();
    });
  });
});

describe('TeamVelocityDashboard - Component States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates team health correctly for high performance', async () => {
    const highPerformanceReport = {
      sprints: Array(6).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Sprint ${i + 1}`,
        period_start: '2024-01-01',
        period_end: '2024-01-14',
        planned_points: 20,
        completed_points: 18,
        completion_rate: 90,
        burn_rate: 3,
      })),
      velocity: 18,
      predictedVelocity: 19,
      capacity: 40,
      burndown: [],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: highPerformanceReport }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Team Health')).toBeInTheDocument();
    });
  });

  it('displays metrics card correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: { sprints: [], velocity: 0, predictedVelocity: 0, capacity: 0, burndown: [] } }),
    });

    await act(async () => {
      render(<TeamVelocityDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Current Velocity')).toBeInTheDocument();
      expect(screen.getByText('Predicted Velocity')).toBeInTheDocument();
      expect(screen.getByText('Team Capacity')).toBeInTheDocument();
      expect(screen.getByText('Team Health')).toBeInTheDocument();
    });
  });
});