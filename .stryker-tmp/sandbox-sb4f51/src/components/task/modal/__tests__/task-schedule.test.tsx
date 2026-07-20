// @ts-nocheck
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
  const mockOnDateChange = vi.fn();
  const mockOnDeadlineChange = vi.fn();
  const mockOnEstimateChange = vi.fn();
  const mockOnActualTimeChange = vi.fn();

  const defaultProps = {
    date: '2024-01-15',
    deadline: '2024-01-15T10:00',
    estimate: '02:30',
    actualTime: '01:00',
    onDateChange: mockOnDateChange,
    onDeadlineChange: mockOnDeadlineChange,
    onEstimateChange: mockOnEstimateChange,
    onActualTimeChange: mockOnActualTimeChange,
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
    const timeInputs = screen.getAllByTestId('input-time');
    expect(timeInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('should render actual time input', () => {
    render(<TaskSchedule {...defaultProps} />);
    expect(screen.getByText('Actual Time (HH:mm)')).toBeInTheDocument();
  });

  it('should have two datetime-local inputs (deadline uses it)', () => {
    render(<TaskSchedule {...defaultProps} />);
    // Deadline should have datetime-local type
    const datetimeInputs = screen.getAllByTestId('input-datetime-local');
    expect(datetimeInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('should have two time inputs (estimate and actual time)', () => {
    render(<TaskSchedule {...defaultProps} />);
    const timeInputs = screen.getAllByTestId('input-time');
    expect(timeInputs.length).toBe(2);
  });

  it('should have one date input', () => {
    render(<TaskSchedule {...defaultProps} />);
    expect(screen.getByTestId('input-date')).toBeInTheDocument();
  });

  it('should call onDateChange when date input changes', () => {
    render(<TaskSchedule {...defaultProps} />);

    const dateInput = screen.getByTestId('input-date');
    fireEvent.change(dateInput, { target: { value: '2024-01-20' } });

    expect(mockOnDateChange).toHaveBeenCalledWith('2024-01-20');
  });

  it('should call onDeadlineChange when deadline input changes', () => {
    render(<TaskSchedule {...defaultProps} />);

    const deadlineInput = screen.getByTestId('input-datetime-local');
    fireEvent.change(deadlineInput, { target: { value: '2024-01-20T15:00' } });

    expect(mockOnDeadlineChange).toHaveBeenCalledWith('2024-01-20T15:00');
  });

  it('should call onEstimateChange when estimate input changes', () => {
    render(<TaskSchedule {...defaultProps} />);

    const timeInputs = screen.getAllByTestId('input-time');
    fireEvent.change(timeInputs[0], { target: { value: '03:00' } });

    expect(mockOnEstimateChange).toHaveBeenCalledWith('03:00');
  });

  it('should call onActualTimeChange when actual time input changes', () => {
    render(<TaskSchedule {...defaultProps} />);

    const timeInputs = screen.getAllByTestId('input-time');
    fireEvent.change(timeInputs[1], { target: { value: '02:00' } });

    expect(mockOnActualTimeChange).toHaveBeenCalledWith('02:00');
  });

  it('should display current date value', () => {
    render(<TaskSchedule {...defaultProps} />);
    const dateInput = screen.getByTestId('input-date') as HTMLInputElement;
    expect(dateInput.value).toBe('2024-01-15');
  });

  it('should display current deadline value', () => {
    render(<TaskSchedule {...defaultProps} />);
    const deadlineInput = screen.getByTestId('input-datetime-local') as HTMLInputElement;
    expect(deadlineInput.value).toBe('2024-01-15T10:00');
  });

  it('should display current estimate value', () => {
    render(<TaskSchedule {...defaultProps} />);
    const timeInputs = screen.getAllByTestId('input-time');
    expect((timeInputs[0] as HTMLInputElement).value).toBe('02:30');
  });

  it('should display current actual time value', () => {
    render(<TaskSchedule {...defaultProps} />);
    const timeInputs = screen.getAllByTestId('input-time');
    expect((timeInputs[1] as HTMLInputElement).value).toBe('01:00');
  });

  it('should handle empty values', () => {
    render(<TaskSchedule {...defaultProps} date="" deadline="" estimate="" actualTime="" />);

    const dateInput = screen.getByTestId('input-date') as HTMLInputElement;
    expect(dateInput.value).toBe('');
  });
});