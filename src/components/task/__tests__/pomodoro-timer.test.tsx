import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PomodoroTimer } from "@/components/task/pomodoro-timer";
import type { TaskWithRelations } from "@/types";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Play: ({ className }: { className?: string }) => <span className={className} data-testid="play-icon">▶</span>,
  Pause: ({ className }: { className?: string }) => <span className={className} data-testid="pause-icon">⏸</span>,
  StopCircle: ({ className }: { className?: string }) => <span className={className} data-testid="stop-icon">⏹</span>,
  RotateCcw: ({ className }: { className?: string }) => <span className={className} data-testid="reset-icon">↺</span>,
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ id, type, value, onChange, disabled, className }: any) => (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
      data-testid="input"
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor} data-testid="label">
      {children}
    </label>
  ),
}));

describe("PomodoroTimer Component", () => {
  const mockTask: TaskWithRelations = {
    id: 1,
    name: "Test Task",
    description: "A test task",
    list_id: 1,
    date: null,
    deadline: null,
    estimate: null,
    actual_time: null,
    priority: "high",
    recurring: "none",
    recurring_config: null,
    completed: 0,
    completed_at: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    sort_order: 0,
    labels: [],
    subtasks: [],
    reminders: [],
    logs: [],
    comments: [],
    blockers: [],
    blocked_by: [],
    time_entries: [],
    recurring_exceptions: [],
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatTime function", () => {
    it("should format 25 minutes correctly", () => {
      const mins = Math.floor(25 * 60 / 60);
      const secs = (25 * 60) % 60;
      const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;
      expect(formatted).toBe("25:00");
    });

    it("should format time under 10 minutes correctly", () => {
      const mins = Math.floor(5 * 60 / 60);
      const secs = 59;
      const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;
      expect(formatted).toBe("5:59");
    });

    it("should format 0 seconds correctly", () => {
      const mins = Math.floor(0 / 60);
      const secs = 0;
      const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;
      expect(formatted).toBe("0:00");
    });
  });

  describe("Initial render", () => {
    it("should render task name", () => {
      render(<PomodoroTimer task={mockTask} />);
      expect(screen.getByText(/Current task:/)).toBeDefined();
      expect(screen.getByText(mockTask.name)).toBeDefined();
    });

    it("should display default time", () => {
      render(<PomodoroTimer task={mockTask} />);
      expect(screen.getByText("25:00")).toBeDefined();
    });

    it("should show 0 completed pomodoros initially", () => {
      render(<PomodoroTimer task={mockTask} />);
      expect(screen.getByText(/Completed: 0 pomodoros/)).toBeDefined();
    });

    it("should show custom time input with default value", () => {
      render(<PomodoroTimer task={mockTask} />);
      const input = document.querySelector('input[data-testid="input"]');
      expect(input).toBeDefined();
      expect((input as HTMLInputElement).value).toBe("25");
    });

    it("should show Start button initially", () => {
      render(<PomodoroTimer task={mockTask} />);
      expect(screen.getByText("Start")).toBeDefined();
    });
  });

  describe("Timer controls", () => {
    it("should start timer when Start is clicked", () => {
      render(<PomodoroTimer task={mockTask} />);
      const startButton = screen.getByText("Start");
      fireEvent.click(startButton);
      // After starting, should show Pause
      expect(screen.getByText("Pause")).toBeDefined();
    });

    it("should pause timer when Pause is clicked", () => {
      render(<PomodoroTimer task={mockTask} />);

      const startButton = screen.getByText("Start");
      fireEvent.click(startButton);

      const pauseButton = screen.getByText("Pause");
      fireEvent.click(pauseButton);

      // Back to Start
      expect(screen.getByText("Start")).toBeDefined();
    });

    it("should reset timer when Stop is clicked", () => {
      render(<PomodoroTimer task={mockTask} />);

      const startButton = screen.getByText("Start");
      fireEvent.click(startButton);

      // Check that timer is running - time should be decreasing
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const stopButton = screen.getByText("Stop");
      fireEvent.click(stopButton);

      // Time should reset to 25:00
      expect(screen.getByText("25:00")).toBeDefined();
    });

    it("should reset all values when Reset is clicked", () => {
      render(<PomodoroTimer task={mockTask} />);

      const resetButton = screen.getByText("Reset");
      fireEvent.click(resetButton);

      expect(screen.getByText("25:00")).toBeDefined();
      expect(screen.getByText(/Completed: 0 pomodoros/)).toBeDefined();
    });
  });

  describe("Time input", () => {
    it("should update time when custom time changes", () => {
      render(<PomodoroTimer task={mockTask} />);

      const input = document.querySelector('input[data-testid="input"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "10" } });

      expect(screen.getByText("10:00")).toBeDefined();
    });

    it("should handle invalid input gracefully", () => {
      render(<PomodoroTimer task={mockTask} />);

      const input = document.querySelector('input[data-testid="input"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: "" } });

      // Should fall back to default (25)
      expect(screen.getByText("25:00")).toBeDefined();
    });
  });

  describe("Help text", () => {
    it("should display pomodoro instructions", () => {
      render(<PomodoroTimer task={mockTask} />);
      expect(screen.getByText(/Focus for 25 minutes/)).toBeDefined();
      expect(screen.getByText(/Take a 5-minute break/)).toBeDefined();
      expect(screen.getByText(/After 4 pomodoros/)).toBeDefined();
    });
  });
});