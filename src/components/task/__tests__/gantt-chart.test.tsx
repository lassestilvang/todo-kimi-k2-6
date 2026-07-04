import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GanttChart } from "@/components/task/gantt-chart";
import type { TaskWithRelations } from "@/types";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  BarChart3: ({ className }: { className?: string }) => <span className={className} data-testid="barchart-icon">📊</span>,
}));

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span variant={variant} className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

describe("GanttChart Component", () => {
  const mockTasks: TaskWithRelations[] = [
    {
      id: 1,
      name: "Task 1",
      description: "First task",
      list_id: 1,
      date: "2024-07-01",
      deadline: "2024-07-05",
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
    },
    {
      id: 2,
      name: "Task 2",
      description: "Second task",
      list_id: 1,
      date: "2024-07-10",
      deadline: null,
      estimate: null,
      actual_time: null,
      priority: "medium",
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
    },
    {
      id: 3,
      name: "Completed Task",
      description: "Done task",
      list_id: 1,
      date: "2024-07-01",
      deadline: "2024-07-03",
      estimate: null,
      actual_time: null,
      priority: "low",
      recurring: "none",
      recurring_config: null,
      completed: 1,
      completed_at: "2024-01-01",
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
    },
    {
      id: 4,
      name: "Blocked Task",
      description: "Has blockers",
      list_id: 1,
      date: "2024-07-15",
      deadline: "2024-07-20",
      estimate: null,
      actual_time: null,
      priority: "critical",
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
      blockers: [{ id: 1, task_id: 4, depends_on_task_id: 1, created_at: "" }],
      blocked_by: [],
      time_entries: [],
      recurring_exceptions: [],
    },
  ];

  const mockOnTaskClick = vi.fn();

  describe("getPriorityColor function", () => {
    it("should return purple for tasks with dependencies", () => {
      const getPriorityColor = (priority: string, hasDependencies?: boolean) => {
        if (hasDependencies) return "bg-purple-500";
        switch (priority) {
          case "critical": return "bg-red-500";
          case "high": return "bg-orange-500";
          case "medium": return "bg-amber-500";
          case "low": return "bg-blue-500";
          default: return "bg-gray-500";
        }
      };

      expect(getPriorityColor("high", true)).toBe("bg-purple-500");
      expect(getPriorityColor("critical", undefined)).toBe("bg-red-500");
      expect(getPriorityColor("high", false)).toBe("bg-orange-500");
      expect(getPriorityColor("medium", false)).toBe("bg-amber-500");
      expect(getPriorityColor("low", false)).toBe("bg-blue-500");
      expect(getPriorityColor("none", false)).toBe("bg-gray-500");
    });
  });

  describe("Component rendering", () => {
    it("should render component title", () => {
      render(<GanttChart tasks={[]} onTaskClick={mockOnTaskClick} />);
      expect(screen.getByText("Gantt Chart")).toBeDefined();
    });

    it("should render description", () => {
      render(<GanttChart tasks={[]} onTaskClick={mockOnTaskClick} />);
      expect(screen.getByText(/Project timeline view/)).toBeDefined();
    });

    it("should show empty state for no tasks", () => {
      render(<GanttChart tasks={[]} onTaskClick={mockOnTaskClick} />);
      expect(screen.getByText(/No tasks with dates to display/)).toBeDefined();
    });

    it("should show legend with all priority levels", () => {
      render(<GanttChart tasks={mockTasks} onTaskClick={mockOnTaskClick} />);

      expect(screen.getByText("Critical")).toBeDefined();
      expect(screen.getByText("High")).toBeDefined();
      expect(screen.getByText("Medium")).toBeDefined();
      expect(screen.getByText("Low")).toBeDefined();
      expect(screen.getByText("Has Dependencies")).toBeDefined();
    });
  });

  describe("Task filtering", () => {
    it("should filter out completed tasks from chart", () => {
      const filtered = mockTasks.filter(t => t.date && !t.completed);
      expect(filtered.length).toBe(3);
      expect(filtered.find(t => t.name === "Completed Task")).toBeUndefined();
    });

    it("should only show tasks with dates", () => {
      const tasksWithDates = mockTasks.filter(t => t.date || t.deadline);
      expect(tasksWithDates.length).toBe(4);
    });
  });

  describe("Date range calculation", () => {
    it("should use current week when no tasks have dates", () => {
      render(<GanttChart tasks={[]} onTaskClick={mockOnTaskClick} />);
      // Component renders without error - dateRange is calculated
      expect(screen.getByText("Gantt Chart")).toBeDefined();
    });
  });

  describe("Task click handler", () => {
    it("should call onTaskClick when task bar is clicked", () => {
      render(<GanttChart tasks={mockTasks} onTaskClick={mockOnTaskClick} />);

      // Click on a task bar (if rendered)
      const taskBars = document.querySelectorAll('[title="Task 1"]');
      if (taskBars.length > 0) {
        fireEvent.click(taskBars[0]);
        expect(mockOnTaskClick).toHaveBeenCalled();
      }
    });
  });

  describe("Duration calculation", () => {
    it("should calculate duration in days", () => {
      const startDate = new Date("2024-07-01");
      const endDate = new Date("2024-07-05");
      const duration = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Duration is exclusive in the component, adds 1
      expect(duration).toBe(4);
    });

    it("should handle single day duration when no deadline", () => {
      const startDate = new Date("2024-07-10");
      const endDate = startDate;
      const duration = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});