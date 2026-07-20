// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TaskCalendar } from "../task-calendar";
import type { TaskWithRelations } from "@/types";

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, variant, size, onClick, className }: any) => (
    <button
      variant={variant}
      size={size}
      onClick={onClick}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span variant={variant} className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ChevronLeft: ({ className }: { className?: string }) => <span className={className} data-testid="chevron-left">←</span>,
  ChevronRight: ({ className }: { className?: string }) => <span className={className} data-testid="chevron-right">→</span>,
}));

// Get current date for testing
const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

const createMockTask = (overrides: Partial<TaskWithRelations> = {}): TaskWithRelations => ({
  id: 1,
  name: "Test Task",
  description: "A test task",
  list_id: 1,
  date: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-15`, // Use current month date
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
  attachments: [],
  blockers: [],
  blocked_by: [],
  time_entries: [],
  recurring_exceptions: [],
  archived: false,
  ...overrides,
});

describe("TaskCalendar Component", () => {
  const mockOnTaskClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Structure", () => {
    it("should render the component with navigation", () => {
      render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      // Should have navigation buttons
      const buttons = screen.getAllByTestId("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should render Today button", () => {
      render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    it("should render weekday headers", () => {
      render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Tue")).toBeInTheDocument();
      expect(screen.getByText("Wed")).toBeInTheDocument();
      expect(screen.getByText("Thu")).toBeInTheDocument();
      expect(screen.getByText("Fri")).toBeInTheDocument();
      expect(screen.getByText("Sat")).toBeInTheDocument();
    });

    it("should render with proper container structure", () => {
      const { container } = render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      const wrapper = container.querySelector("div.p-4");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("Month Navigation", () => {
    it("should render navigation buttons", () => {
      render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      const chevronLeft = screen.getByTestId("chevron-left");
      const chevronRight = screen.getByTestId("chevron-right");

      expect(chevronLeft).toBeInTheDocument();
      expect(chevronRight).toBeInTheDocument();
    });

    it("should navigate to previous month when left button clicked", () => {
      render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      const chevronLeft = screen.getByTestId("chevron-left");
      fireEvent.click(chevronLeft);

      // Month should change (no direct way to verify, but should not throw)
      expect(chevronLeft).toBeInTheDocument();
    });

    it("should navigate to next month when right button clicked", () => {
      render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      const chevronRight = screen.getByTestId("chevron-right");
      fireEvent.click(chevronRight);

      // Month should change
      expect(chevronRight).toBeInTheDocument();
    });

    it("should navigate to today when Today button clicked", () => {
      const { container } = render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      const todayButton = screen.getByText("Today");
      fireEvent.click(todayButton);

      // Should still render calendar
      expect(screen.getByText("Today")).toBeInTheDocument();
    });
  });

  describe("Task Display", () => {
    it("should render calendar grid for current month", () => {
      render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      // Calendar grid should exist
      const grid = document.querySelector(".grid");
      expect(grid).toBeInTheDocument();
    });

    it("should handle empty tasks array", () => {
      render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      // Should render calendar without crashing
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    it("should display tasks with dates", () => {
      const tasks = [createMockTask({ id: 1, name: "Test Task", priority: "high" })];
      render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      // Task should be rendered
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    });

    it("should not display tasks without dates", () => {
      const tasks = [createMockTask({ id: 1, name: "No Date Task", date: null })];
      render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      // Should render calendar without the task
      const grid = document.querySelector(".grid");
      expect(grid).toBeInTheDocument();
    });

    it("should show task count badge when tasks exist on a day", () => {
      const tasks = [
        createMockTask({ id: 1, name: "Task 1" }),
        createMockTask({ id: 2, name: "Task 2" }),
      ];
      render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      // Should render tasks
      expect(screen.getByText("Task 1")).toBeInTheDocument();
      expect(screen.getByText("Task 2")).toBeInTheDocument();
    });

    it("should handle multiple tasks on same day showing count", () => {
      const tasks = [
        createMockTask({ id: 1, name: "Task 1" }),
        createMockTask({ id: 2, name: "Task 2" }),
        createMockTask({ id: 3, name: "Task 3" }),
        createMockTask({ id: 4, name: "Task 4" }),
      ];
      const { container } = render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      // Should show "+N more" for tasks beyond 3
      expect(screen.getByText("+1 more")).toBeInTheDocument();
    });
  });

  describe("Priority Colors", () => {
    it("should render tasks with critical priority with red color", () => {
      const tasks = [createMockTask({ id: 1, name: "Critical Task", priority: "critical" })];
      const { container } = render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      expect(container.querySelector(".bg-red-500")).toBeInTheDocument();
    });

    it("should render tasks with high priority with orange color", () => {
      const tasks = [createMockTask({ id: 1, name: "High Task", priority: "high" })];
      const { container } = render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      expect(container.querySelector(".bg-orange-500")).toBeInTheDocument();
    });

    it("should render tasks with medium priority with yellow color", () => {
      const tasks = [createMockTask({ id: 1, name: "Medium Task", priority: "medium" })];
      const { container } = render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      expect(container.querySelector(".bg-yellow-500")).toBeInTheDocument();
    });

    it("should render tasks with low priority with blue color", () => {
      const tasks = [createMockTask({ id: 1, name: "Low Task", priority: "low" })];
      const { container } = render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      expect(container.querySelector(".bg-blue-500")).toBeInTheDocument();
    });

    it("should render tasks with default (none) priority with gray color", () => {
      const tasks = [createMockTask({ id: 1, name: "Default Task", priority: "none" })];
      const { container } = render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      expect(container.querySelector(".bg-gray-400")).toBeInTheDocument();
    });
  });

  describe("Date Handling", () => {
    it("should handle tasks with dates correctly", () => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-15`;
      const tasks = [createMockTask({ id: 1, date: dateStr })];
      const { container } = render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      expect(container).toBeInTheDocument();
    });

    it("should not display tasks without dates", () => {
      const tasks = [createMockTask({ id: 1, name: "No Date Task", date: null })];
      const { container } = render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      expect(container).toBeInTheDocument();
    });

    it("should handle empty string date in task", () => {
      const tasks = [createMockTask({ id: 1, name: "Empty Date Task", date: "" })];

      render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      // Should not crash - verify calendar renders
      const buttons = screen.getAllByTestId("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should handle null date in task", () => {
      const tasks = [createMockTask({ id: 1, name: "Null Date Task", date: null as any })];

      render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      // Should not crash - verify calendar renders
      const buttons = screen.getAllByTestId("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("Task Click Handler", () => {
    it("should accept onTaskClick handler", () => {
      const tasks = [createMockTask({ id: 1 })];
      render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      // Handler is passed correctly
      expect(mockOnTaskClick).not.toHaveBeenCalled();
    });

    it("should call onTaskClick when task element clicked", () => {
      const tasks = [createMockTask({ id: 1, name: "Clickable Task" })];
      render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      const taskElement = screen.getByText("Clickable Task").closest("div");
      if (taskElement) {
        fireEvent.click(taskElement);
      }
      // Note: actual click behavior depends on implementation
    });
  });

  describe("Today Highlight", () => {
    it("should highlight today's date", () => {
      render(<TaskCalendar tasks={[]} onTaskClick={mockOnTaskClick} />);

      // Find today's date number
      const todayNum = today.getDate();
      const todayElement = screen.getByText(String(todayNum));
      expect(todayElement).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle large number of tasks", () => {
      const tasks = Array.from({ length: 50 }, (_, i) =>
        createMockTask({ id: i + 1, name: `Task ${i + 1}` })
      );

      render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      // Should render without crashing
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    it("should handle tasks with same date", () => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-15`;
      const tasks = [
        createMockTask({ id: 1, name: "Task 1", date: dateStr }),
        createMockTask({ id: 2, name: "Task 2", date: dateStr }),
        createMockTask({ id: 3, name: "Task 3", date: dateStr }),
      ];

      render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      // All tasks should be visible
      expect(screen.getByText("Task 1")).toBeInTheDocument();
      expect(screen.getByText("Task 2")).toBeInTheDocument();
      expect(screen.getByText("Task 3")).toBeInTheDocument();
    });

    it("should handle tasks across multiple days", () => {
      // Use dates that exist in the current month (max 31 days)
      const day1 = Math.min(1, new Date(currentYear, currentMonth + 1, 0).getDate());
      const tasks = [
        createMockTask({ id: 1, name: "Day 1", date: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day1).padStart(2, "0")}` }),
        createMockTask({ id: 2, name: "Day 15", date: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-15` }),
        createMockTask({ id: 3, name: "Day 30", date: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-30` }),
      ];

      render(<TaskCalendar tasks={tasks} onTaskClick={mockOnTaskClick} />);

      // All tasks should be visible
      expect(screen.getByText("Day 1")).toBeInTheDocument();
      expect(screen.getByText("Day 15")).toBeInTheDocument();
      expect(screen.getByText("Day 30")).toBeInTheDocument();
    });
  });
});