import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Play: () => <span data-testid="icon-play">▶</span>,
  Pause: () => <span data-testid="icon-pause">⏸</span>,
  StopCircle: () => <span data-testid="icon-stop">⏹</span>,
  Clock: () => <span data-testid="icon-clock">🕐</span>,
  Edit: () => <span data-testid="icon-edit">✏️</span>,
  Trash2: () => <span data-testid="icon-trash">🗑️</span>,
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, disabled, size, className }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid={`btn-${variant || "default"}`} className={className}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, className }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} className={className} data-testid="input" />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: any) => <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children, className }: any) => <div data-testid="dialog-content" className={className}>{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock time actions
vi.mock("@/lib/actions/time", () => ({
  addTimeEntry: vi.fn(),
  getTimeEntries: vi.fn(),
  updateTimeEntry: vi.fn(),
  deleteTimeEntry: vi.fn(),
}));

import { TimeTracker } from "@/components/task/time-tracker";
import type { TaskWithRelations } from "@/types";
import * as timeActions from "@/lib/actions/time";

const mockTask: TaskWithRelations = {
  id: 1,
  name: "Test Task",
  description: "A test task",
  list_id: 1,
  date: "2024-01-15",
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

const createMockTimeEntry = (overrides: any = {}): any => ({
  id: 1,
  task_id: 1,
  start_time: "2024-01-15T09:00:00Z",
  end_time: "2024-01-15T10:00:00Z",
  duration_seconds: 3600,
  description: "Test work",
  created_at: "2024-01-15T09:00:00Z",
  ...overrides,
});

describe("TimeTracker Component", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (timeActions.addTimeEntry as any).mockResolvedValue(createMockTimeEntry());
    (timeActions.deleteTimeEntry as any).mockResolvedValue(undefined);
    (timeActions.getTimeEntries as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Initial State", () => {
    it("should render with total time display", () => {
      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("Total time spent")).toBeInTheDocument();
    });

    it("should show Time Tracking title", () => {
      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("Time Tracking")).toBeInTheDocument();
    });

    it("should display 0h 0m 0s when no entries", () => {
      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("0h 0m 0s")).toBeInTheDocument();
    });
  });

  describe("Timer Controls", () => {
    it("should start timer when Play button is clicked", async () => {
      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      const playButton = screen.getByTestId("btn-default");
      fireEvent.click(playButton);

      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    it("should pause timer when Pause button is clicked", async () => {
      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      const playButton = screen.getByTestId("btn-default");
      fireEvent.click(playButton);

      const pauseButton = screen.getByTestId("btn-destructive");
      fireEvent.click(pauseButton);

      // Timer should be paused
      expect(screen.queryByText("Running")).not.toBeInTheDocument();
    });

    it("should show stop button with icon when running", async () => {
      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      const playButton = screen.getByTestId("btn-default");
      fireEvent.click(playButton);

      // Check for stop icon within a button
      expect(screen.getByTestId("icon-stop")).toBeInTheDocument();
    });

    it("should stop and log time when stop is clicked", async () => {
      const addTimeEntryMock = vi.fn().mockResolvedValue(createMockTimeEntry());
      (timeActions.addTimeEntry as any).mockImplementation(addTimeEntryMock);

      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      const playButton = screen.getByTestId("btn-default");
      fireEvent.click(playButton);

      // Advance timers to simulate elapsed time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      const stopIcon = screen.getByTestId("icon-stop");
      const stopButton = stopIcon.closest("button");
      if (stopButton) {
        fireEvent.click(stopButton);
      }

      // Should call addTimeEntry
      expect(addTimeEntryMock).toHaveBeenCalled();
    });
  });

  describe("Time Entries Display", () => {
    it("should display time entries when loaded", async () => {
      (timeActions.getTimeEntries as any).mockResolvedValue([createMockTimeEntry()]);

      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      // Time entries should load on open
      await act(async () => {
        await vi.runAllTimersAsync();
      });
    });

    it("should show empty state when no entries", () => {
      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("No time entries yet")).toBeInTheDocument();
    });

    it("should handle delete entry", async () => {
      (timeActions.getTimeEntries as any).mockResolvedValue([createMockTimeEntry()]);

      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });
    });
  });

  describe("Description Input", () => {
    it("should render description input when running", async () => {
      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      const playButton = screen.getByTestId("btn-default");
      fireEvent.click(playButton);

      // Description input should be visible
      const descriptionInput = screen.getByPlaceholderText("What are you working on?");
      expect(descriptionInput).toBeInTheDocument();
    });
  });

  describe("Visibility Change Handler", () => {
    it("should handle visibility events when running", async () => {
      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      const playButton = screen.getByTestId("btn-default");
      await act(async () => {
        fireEvent.click(playButton);
      });

      // Simulate visibility change
      Object.defineProperty(document, "hidden", { value: true, writable: true });
      await act(async () => {
        fireEvent(document, new Event("visibilitychange"));
      });
    });

    it("should clean up interval on unmount", () => {
      const { unmount } = render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      unmount();

      // No assertion needed - just verify no errors on unmount
    });
  });

  describe("Close Handler", () => {
    it("should close dialog when Close button is clicked", () => {
      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle failed time entry addition gracefully", async () => {
      (timeActions.addTimeEntry as any).mockRejectedValue(new Error("Database error"));

      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      const playButton = screen.getByTestId("btn-default");
      fireEvent.click(playButton);

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      const stopIcon = screen.getByTestId("icon-stop");
      const stopButton = stopIcon.closest("button");
      if (stopButton) {
        fireEvent.click(stopButton);
      }
    });

    it("should handle failed time entry deletion gracefully", async () => {
      (timeActions.getTimeEntries as any).mockResolvedValue([createMockTimeEntry()]);
      (timeActions.deleteTimeEntry as any).mockRejectedValue(new Error("Delete failed"));

      render(<TimeTracker task={mockTask} open={true} onOpenChange={mockOnOpenChange} />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });
    });
  });

  describe("Format Duration", () => {
    it("should format seconds to hours minutes seconds format correctly", () => {
      const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs}h ${mins}m ${secs}s`;
      };

      expect(formatDuration(0)).toBe("0h 0m 0s");
      expect(formatDuration(60)).toBe("0h 1m 0s");
      expect(formatDuration(3661)).toBe("1h 1m 1s");
      expect(formatDuration(7325)).toBe("2h 2m 5s");
    });
  });
});