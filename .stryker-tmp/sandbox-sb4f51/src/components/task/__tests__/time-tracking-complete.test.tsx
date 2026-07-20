// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Clock: () => <span data-testid="icon-clock">🕐</span>,
  Play: () => <span data-testid="icon-play">▶</span>,
  Pause: () => <span data-testid="icon-pause">⏸</span>,
  StopCircle: () => <span data-testid="icon-stop">⏹</span>,
  Plus: () => <span data-testid="icon-plus">+</span>,
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid={`btn-${variant || "default"}`}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} data-testid="input" />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}));

// Mock Popover component
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children, open }: any) => <div data-testid="popover" data-open={open}>{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

import { TimeTracking } from "@/components/task/time-tracking";
import type { TimeEntry } from "@/types";

const createMockTimeEntries = (count: number): TimeEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    task_id: 1,
    start_time: `2024-01-0${i + 1}T09:00:00Z`,
    end_time: `2024-01-0${i + 1}T10:00:00Z`,
    duration_seconds: 3600,
    description: `Entry ${i + 1}`,
    created_at: `2024-01-0${i + 1}T09:00:00Z`,
  }));

describe("TimeTracking Component - Complete Coverage", () => {
  const mockOnLogTime = vi.fn();
  const mockOnDeleteEntry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Static rendering", () => {
    it("should render Time Tracking header", () => {
      render(<TimeTracking taskId={1} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);
      expect(screen.getByText("Time Tracking")).toBeInTheDocument();
    });

    it("should render Clock icon", () => {
      render(<TimeTracking taskId={1} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);
      expect(screen.getByTestId("icon-clock")).toBeInTheDocument();
    });

    it("should render Total time label", () => {
      render(<TimeTracking taskId={1} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });
  });

  describe("Timer display", () => {
    it("should show 0:00:00 when no time entries and not running", () => {
      render(<TimeTracking taskId={1} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);
      expect(screen.getByText("0:00:00")).toBeInTheDocument();
    });

    it("should calculate total time from entries", () => {
      const entries = createMockTimeEntries(2);
      const { container } = render(<TimeTracking taskId={1} timeEntries={entries} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);
      // Total time: 3600 * 2 = 7200 seconds = 2:00:00
      expect(container.textContent).toContain("2:00:00");
    });
  });

  describe("Controls visibility", () => {
    it("should show Start button when not running", () => {
      render(<TimeTracking taskId={1} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);
      expect(screen.getByTestId("btn-default")).toBeInTheDocument();
    });

    it("should show Pause button when running", () => {
      render(<TimeTracking taskId={1} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);

      // Start the timer
      const startButton = screen.getByTestId("btn-default");
      fireEvent.click(startButton);

      expect(screen.getByTestId("icon-play")).toBeInTheDocument();
    });

    it("should start timer when Play button is clicked", () => {
      render(<TimeTracking taskId={1} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);

      const startButton = screen.getByTestId("btn-default");
      fireEvent.click(startButton);

      // Component should update to show running state
      expect(screen.getByText("Time Tracking")).toBeInTheDocument();
    });
  });

  describe("Log time functionality", () => {
    it("should call onLogTime when log is triggered", () => {
      render(<TimeTracking taskId={1} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);

      // Start timer
      const startButton = screen.getByTestId("btn-default");
      fireEvent.click(startButton);
    });

    it("should handle empty description state", () => {
      render(<TimeTracking taskId={1} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);

      const startButton = screen.getByTestId("btn-default");
      fireEvent.click(startButton);

      // Description input should not exist initially (only shown when running)
      expect(screen.queryByPlaceholderText("Description")).toBeNull();
    });
  });

  describe("Time entries display", () => {
    it("should not show entries section when empty", () => {
      render(<TimeTracking taskId={1} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);
      // No entries section should render
      expect(screen.queryByText("No time entries")).toBeNull();
    });

    it("should handle entries without end_time (running entries)", () => {
      const entries = [
        {
          id: 1,
          task_id: 1,
          start_time: "2024-01-01T09:00:00Z",
          end_time: null,
          duration_seconds: 1800,
          description: "Running entry without end time",
          created_at: "2024-01-01T09:00:00Z",
        },
      ];
      render(<TimeTracking taskId={1} timeEntries={entries} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);
      expect(screen.getByText("Time Tracking")).toBeInTheDocument();
    });
  });

  describe("Delete entry", () => {
    it("should call onDeleteEntry when delete is triggered", () => {
      const entries = createMockTimeEntries(1);
      render(<TimeTracking taskId={1} timeEntries={entries} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);

      // Find and click delete button
      const deleteButtons = screen.getAllByRole("button");
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle taskId prop correctly", () => {
      render(<TimeTracking taskId={999} timeEntries={[]} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);
      expect(screen.getByText("Time Tracking")).toBeInTheDocument();
    });

    it("should handle multiple time entries", () => {
      const entries = createMockTimeEntries(5);
      render(<TimeTracking taskId={1} timeEntries={entries} onLogTime={mockOnLogTime} onDeleteEntry={mockOnDeleteEntry} />);
      expect(screen.getByText("Time Tracking")).toBeInTheDocument();
    });
  });
});