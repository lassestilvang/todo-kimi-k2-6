import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskSchedule } from '../task-schedule';

// Mock icons
vi.mock('lucide-react', () => ({
  Calendar: () => <span data-testid="icon-calendar" />,
  Clock: () => <span data-testid="icon-clock" />,
}));

// Mock UI components
vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ type, value, onChange }: { type: string; value?: string; onChange?: (e: any) => void }) => (
    <input type={type} value={value} onChange={onChange} data-testid={`input-${type}`} />
  ),
}));

describe('TaskSchedule', () => {
  const defaultTask = {
    date: '2024-01-15',
    deadline: '2024-01-15T10:00',
    estimate: '02:30',
    notes: 'Test notes' as string | null,
  };

  const defaultLists = [
    { id: 1, name: 'Inbox', emoji: '📥', color: '#6366f1' },
  ];

  const defaultProps = {
    task: defaultTask,
    lists: defaultLists,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render date input with calendar icon', () => {
    render(<TaskSchedule {...defaultProps} />);
    expect(screen.getByTestId('icon-calendar')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
  });

  it('should render deadline input with clock icon', () => {
    render(<TaskSchedule {...defaultProps} />);
    expect(screen.getByTestId('icon-clock')).toBeInTheDocument();
    expect(screen.getByText('Deadline')).toBeInTheDocument();
  });

  it('should render estimate input', () => {
    render(<TaskSchedule {...defaultProps} />);
    expect(screen.getByText('Estimate (HH:mm)')).toBeInTheDocument();
    const timeInputs = screen.getAllByTestId('input-time') as HTMLInputElement[];
    expect(timeInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('should render actual time input', () => {
    render(<TaskSchedule {...defaultProps} />);
    expect(screen.getByText('Actual Time (HH:mm)')).toBeInTheDocument();
  });

  it('should render date input', () => {
    render(<TaskSchedule {...defaultProps} />);
    expect(screen.getByTestId('input-date')).toBeInTheDocument();
  });

  it('should display current date value', () => {
    render(<TaskSchedule {...defaultProps} />);
    const dateInput = screen.getByTestId('input-date') as HTMLInputElement;
    expect(dateInput.value).toBe('2024-01-15');
  });

  it('should display current estimate value', () => {
    render(<TaskSchedule {...defaultProps} />);
    const timeInputs = screen.getAllByTestId('input-time') as HTMLInputElement[];
    expect((timeInputs[0] as HTMLInputElement).value).toBe('02:30');
  });

  it('should handle empty task values', () => {
    const emptyTask = {
      date: '',
      deadline: '',
      estimate: '',
      notes: null,
    };
    render(<TaskSchedule task={emptyTask} lists={defaultLists} />);

    const dateInput = screen.getByTestId('input-date') as HTMLInputElement;
    expect(dateInput.value).toBe('');
  });
});