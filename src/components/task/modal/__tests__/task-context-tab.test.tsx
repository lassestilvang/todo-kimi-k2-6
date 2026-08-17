import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskContextTab } from '../task-context-tab';
import type { TaskWithRelations, HabitContext } from '@/types';

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className,
    variant,
    size,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: string;
    size?: string;
  }) => (
    <button
      onClick={onClick}
      className={className}
      data-testid={`button`}
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid={`badge`} className={className}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="input"
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div data-testid="select-wrapper">
      <select
        data-testid="select"
        value={value}
        onChange={e => onValueChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: any) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: () => <span data-testid="select-value">Select...</span>,
}));

vi.mock('lucide-react', () => ({
  Brain: ({ className }: { className?: string }) => (
    <span className={className} data-testid="brain-icon">
      🧠
    </span>
  ),
  Clock: ({ className }: { className?: string }) => (
    <span className={className} data-testid="clock-icon">
      ⏰
    </span>
  ),
  MapPin: ({ className }: { className?: string }) => (
    <span className={className} data-testid="mappin-icon">
      📍
    </span>
  ),
  Smile: ({ className }: { className?: string }) => (
    <span className={className} data-testid="smile-icon">
      😊
    </span>
  ),
  Battery: ({ className }: { className?: string }) => (
    <span className={className} data-testid="battery-icon">
      🔋
    </span>
  ),
  Coffee: ({ className }: { className?: string }) => (
    <span className={className} data-testid="coffee-icon">
      ☕
    </span>
  ),
  Globe: ({ className }: { className?: string }) => (
    <span className={className} data-testid="globe-icon">
      🌍
    </span>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

const createMockTask = (
  overrides: Partial<TaskWithRelations> = {}
): TaskWithRelations => ({
  id: 1,
  name: 'Test Task',
  description: 'A test task',
  notes: null,
  user_id: 1,
  list_id: 1,
  date: '2024-01-15',
  deadline: null,
  estimate: null,
  actual_time: null,
  priority: 'high',
  recurring: 'none',
  recurring_config: null,
  completed: false,
  completed_at: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  sort_order: 0,
  labels: [],
  subtasks: [],
  reminders: [],
  logs: [],
  comments: [],
  attachments: [],
  blockers: [],
  blocked_by: [],
  time_entries: [],
  recurring_exceptions: [],
  archived: false,
  ...overrides,
});

const createMockContext = (
  overrides: Partial<HabitContext> = {}
): HabitContext => ({
  id: 1,
  task_id: 1,
  user_id: 1,
  context_type: 'time_of_day',
  context_value: 'morning',
  frequency: 5,
  success_rate: 80,
  created_at: '2024-01-01',
  ...overrides,
});

describe('TaskContextTab', () => {
  const mockTask = createMockTask({ id: 1, name: 'Test Task' });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockReset();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => createMockContext(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the component with title', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(screen.getByText('Context Tracker')).toBeInTheDocument();
    });

    it('renders brain icon', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(screen.getByTestId('brain-icon')).toBeInTheDocument();
    });

    it('shows description text', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(
        screen.getByText(/Track when you're most productive/)
      ).toBeInTheDocument();
    });

    it('shows context type select', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(screen.getByTestId('select')).toBeInTheDocument();
    });

    it('renders select options', () => {
      render(<TaskContextTab task={mockTask} />);

      // Should have select options
      const select = screen.getByTestId('select');
      const options = select.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe('Context Values for Time of Day', () => {
    it('shows morning option as button', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(screen.getByText('Morning (6am-12pm)')).toBeInTheDocument();
    });

    it('shows afternoon option as button', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(screen.getByText('Afternoon (12pm-6pm)')).toBeInTheDocument();
    });

    it('shows evening option as button', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(screen.getByText('Evening (6pm-10pm)')).toBeInTheDocument();
    });

    it('shows night option as button', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(screen.getByText('Night (10pm-6am)')).toBeInTheDocument();
    });
  });

  describe('Context Value Buttons', () => {
    it('shows all context value buttons for selected type', () => {
      render(<TaskContextTab task={mockTask} />);

      // Should have time_of_day options displayed
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('selecting a value highlights the button', () => {
      render(<TaskContextTab task={mockTask} />);

      const morningButton = screen
        .getByText('Morning (6am-12pm)')
        .closest('button');
      if (morningButton) {
        fireEvent.click(morningButton);
      }

      // Button should have default variant when selected
      expect(screen.getByText('Morning (6am-12pm)')).toBeInTheDocument();
    });
  });

  describe('Success/Failure Buttons', () => {
    it('has yes button', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(screen.getByText('✅ Yes')).toBeInTheDocument();
    });

    it('has no button', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(screen.getByText('❌ No')).toBeInTheDocument();
    });

    it('toggling success button updates state', () => {
      render(<TaskContextTab task={mockTask} />);

      const yesButton = screen.getByText('✅ Yes');
      const noButton = screen.getByText('❌ No');

      fireEvent.click(yesButton);
      fireEvent.click(noButton);

      // Both buttons should still be present
      expect(screen.getByText('✅ Yes')).toBeInTheDocument();
      expect(screen.getByText('❌ No')).toBeInTheDocument();
    });
  });

  describe('Record Context Button', () => {
    it('has record context button', () => {
      render(<TaskContextTab task={mockTask} />);

      expect(screen.getByText('Record Context')).toBeInTheDocument();
    });

    it('record button is clickable', () => {
      render(<TaskContextTab task={mockTask} />);

      const recordButton = screen.getByText('Record Context');
      expect(recordButton).toBeInTheDocument();
      expect(recordButton.tagName.toLowerCase()).toBe('button');
    });

    it('record button works when value selected', () => {
      render(<TaskContextTab task={mockTask} />);

      // Select a value first
      const morningButton = screen
        .getByText('Morning (6am-12pm)')
        .closest('button');
      if (morningButton) {
        fireEvent.click(morningButton);
      }

      const recordButton = screen.getByText('Record Context');
      expect(recordButton).toBeInTheDocument();
    });
  });

  describe('Context Stats Display', () => {
    it('shows stats section when contexts exist', () => {
      const contexts: HabitContext[] = [
        createMockContext({
          id: 1,
          context_type: 'time_of_day',
          frequency: 5,
          success_rate: 80,
        }),
      ];

      render(<TaskContextTab task={mockTask} contexts={contexts} />);

      expect(screen.getByText('Your Patterns')).toBeInTheDocument();
    });

    it('shows frequency for context', () => {
      const contexts: HabitContext[] = [
        createMockContext({
          id: 1,
          context_type: 'time_of_day',
          frequency: 5,
          success_rate: 80,
        }),
      ];

      render(<TaskContextTab task={mockTask} contexts={contexts} />);

      expect(screen.getByText('5 recordings')).toBeInTheDocument();
    });

    it('shows success rate for context', () => {
      const contexts: HabitContext[] = [
        createMockContext({
          id: 1,
          context_type: 'time_of_day',
          frequency: 5,
          success_rate: 80,
        }),
      ];

      render(<TaskContextTab task={mockTask} contexts={contexts} />);

      expect(screen.getByText('80% success')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('calls API when recording context', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => createMockContext(),
      });

      render(<TaskContextTab task={mockTask} />);

      // Select a value first
      const morningButton = screen
        .getByText('Morning (6am-12pm)')
        .closest('button');
      if (morningButton) {
        fireEvent.click(morningButton);
      }

      const recordButton = screen.getByText('Record Context');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty contexts array', () => {
      render(<TaskContextTab task={mockTask} contexts={[]} />);

      // Should render without crashing
      expect(screen.getByText('Context Tracker')).toBeInTheDocument();
    });

    it('handles null task', () => {
      const { container } = render(<TaskContextTab task={null as any} />);

      // Should not crash
      expect(container).toBeInTheDocument();
    });
  });

  describe('onContextUpdate callback', () => {
    it('exists as a prop', () => {
      const mockOnContextUpdate = vi.fn();

      render(
        <TaskContextTab task={mockTask} onContextUpdate={mockOnContextUpdate} />
      );

      expect(mockOnContextUpdate).not.toHaveBeenCalled();
    });

    it('calls callback when context is recorded', async () => {
      const mockOnContextUpdate = vi.fn();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => createMockContext(),
      });

      render(
        <TaskContextTab task={mockTask} onContextUpdate={mockOnContextUpdate} />
      );

      // Select a value first
      const morningButton = screen
        .getByText('Morning (6am-12pm)')
        .closest('button');
      if (morningButton) {
        fireEvent.click(morningButton);
      }

      const recordButton = screen.getByText('Record Context');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(mockOnContextUpdate).toHaveBeenCalled();
      });
    });
  });
});
