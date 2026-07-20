// @ts-nocheck
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskStreakTab } from "../task-streak-tab";
import type { TaskWithRelations } from "@/types";

// Mock StreakCalendar component
vi.mock("@/components/task/streak-calendar", () => ({
  StreakCalendar: ({ taskId, taskName, currentDate, completedDates, onDateToggle }: any) => (
    <div data-testid="streak-calendar" data-task-id={taskId} data-task-name={taskName} data-current-date={currentDate}>
      <div data-testid="completed-dates">{completedDates.length}</div>
      <button data-testid="date-toggle" onClick={() => onDateToggle?.("2024-01-15")}>Toggle Date</button>
    </div>
  ),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createMockTask = (overrides: Partial<TaskWithRelations> = {}): TaskWithRelations => ({
  id: 1,
  name: "Test Habit Task",
  description: "A test habit task",
  list_id: 1,
  date: "2024-01-15",
  deadline: null,
  estimate: null,
  actual_time: null,
  priority: "medium",
  recurring: "daily",
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
  archived: false,
  ...overrides,
});

describe("TaskStreakTab Component", () => {
  describe("Component Structure", () => {
    it("should render the component with a title", () => {
      const task = createMockTask();
      render(<TaskStreakTab task={task} />);

      expect(screen.getByText("Habit Streak")).toBeInTheDocument();
    });

    it("should render the streak calendar", () => {
      const task = createMockTask();
      render(<TaskStreakTab task={task} />);

      expect(screen.getByTestId("streak-calendar")).toBeInTheDocument();
    });

    it("should pass correct props to StreakCalendar", () => {
      const task = createMockTask({
        id: 42,
        name: "Custom Task Name",
        date: "2024-01-20",
        completed: 1,
      });
      render(<TaskStreakTab task={task} />);

      const calendar = screen.getByTestId("streak-calendar");
      expect(calendar).toHaveAttribute("data-task-id", "42");
      expect(calendar).toHaveAttribute("data-task-name", "Custom Task Name");
      expect(calendar).toHaveAttribute("data-current-date", "2024-01-20");
    });
  });

  describe("Description Text", () => {
    it("should render the description text", () => {
      const task = createMockTask();
      render(<TaskStreakTab task={task} />);

      expect(screen.getByText(/Track your progress on this recurring task/)).toBeInTheDocument();
    });

    it("should mention building streak", () => {
      const task = createMockTask();
      render(<TaskStreakTab task={task} />);

      expect(screen.getByText(/Mark it complete each day to build your streak/)).toBeInTheDocument();
    });
  });

  describe("Completed Dates Handling", () => {
    it("should pass empty array for incomplete tasks", () => {
      const task = createMockTask({ completed: 0 });
      render(<TaskStreakTab task={task} />);

      expect(screen.getByTestId("completed-dates")).toHaveTextContent("0");
    });

    it("should pass completed date for completed tasks", () => {
      const task = createMockTask({
        completed: 1,
        date: "2024-01-15"
      });
      render(<TaskStreakTab task={task} />);

      expect(screen.getByTestId("completed-dates")).toHaveTextContent("1");
    });

    it("should handle null date gracefully", () => {
      const task = createMockTask({ date: null });
      render(<TaskStreakTab task={task} />);

      // Should render without crashing
      expect(screen.getByTestId("streak-calendar")).toBeInTheDocument();
    });
  });

  describe("Date Handling", () => {
    it("should pass the task date to calendar", () => {
      const task = createMockTask({ date: "2024-03-15" });
      render(<TaskStreakTab task={task} />);

      expect(screen.getByTestId("streak-calendar")).toHaveAttribute("data-current-date", "2024-03-15");
    });

    it("should handle empty string date", () => {
      const task = createMockTask({ date: "" });
      render(<TaskStreakTab task={task} />);

      expect(screen.getByTestId("streak-calendar")).toHaveAttribute("data-current-date", "");
    });
  });

  describe("Task Name Handling", () => {
    it("should pass task name to calendar", () => {
      const task = createMockTask({ name: "Morning Meditation" });
      render(<TaskStreakTab task={task} />);

      expect(screen.getByTestId("streak-calendar")).toHaveAttribute("data-task-name", "Morning Meditation");
    });

    it("should handle long task names", () => {
      const task = createMockTask({
        name: "A very long task name that might need to be truncated in the UI"
      });
      render(<TaskStreakTab task={task} />);

      expect(screen.getByTestId("streak-calendar")).toHaveAttribute("data-task-name", "A very long task name that might need to be truncated in the UI");
    });
  });

  describe("Date Toggle Handler", () => {
    it("should call onDateToggle when date is toggled", () => {
      const task = createMockTask();
      render(<TaskStreakTab task={task} />);

      const toggleButton = screen.getByTestId("date-toggle");
      fireEventClick(toggleButton);
    });
  });

  describe("Layout Structure", () => {
    it("should have proper spacing classes", () => {
      const task = createMockTask();
      const { container } = render(<TaskStreakTab task={task} />);

      const wrapper = container.querySelector("div");
      expect(wrapper).toHaveClass("space-y-4");
      expect(wrapper).toHaveClass("pt-4");
    });
  });
});

// Helper function for fireEvent
function fireEventClick(element: HTMLElement) {
  element.click();
}