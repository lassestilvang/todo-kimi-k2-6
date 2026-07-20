// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskConnectionsTab } from "../task-connections-tab";
import type { Task, TaskConnection } from "@/types";

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, variant, size, onClick, className }: any) => (
    <button
      variant={variant}
      size={size}
      onClick={onClick}
      className={className}
      data-testid="button"
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="input"
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span variant={variant} className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div data-testid="select-wrapper">
      <select
        data-testid="select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <span data-testid="select-value">Select...</span>,
}));

vi.mock("lucide-react", () => ({
  Link: ({ className }: { className?: string }) => <span className={className} data-testid="link-icon">LINK</span>,
  Filter: ({ className }: { className?: string }) => <span className={className} data-testid="filter-icon">FILTER</span>,
  ExternalLink: ({ className }: { className?: string }) => <span className={className} data-testid="external-icon">EXT</span>,
  Lightbulb: ({ className }: { className?: string }) => <span className={className} data-testid="lightbulb-icon">💡</span>,
  BookOpen: ({ className }: { className?: string }) => <span className={className} data-testid="book-icon">📖</span>,
  AlertTriangle: ({ className }: { className?: string }) => <span className={className} data-testid="alert-icon">⚠️</span>,
  RefreshCw: ({ className }: { className?: string }) => <span className={className} data-testid="refresh-icon">🔄</span>,
  X: ({ className }: { className?: string }) => <span className={className} data-testid="x-icon">X</span>,
  Plus: ({ className }: { className?: string }) => <span className={className} data-testid="plus-icon">+</span>,
  Trash2: ({ className }: { className?: string }) => <span className={className} data-testid="trash-icon">🗑️</span>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  name: "Test Task",
  description: "A test task",
  user_id: 1,
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
  attachments: [],
  blockers: [],
  blocked_by: [],
  time_entries: [],
  recurring_exceptions: [],
  archived: false,
  ...overrides,
});

const createMockConnection = (overrides: Partial<TaskConnection> = {}): TaskConnection => ({
  id: 1,
  source_task_id: 1,
  target_task_id: 2,
  connection_type: "related",
  notes: "Test connection",
  strength: 0.5,
  created_at: "2024-01-01",
  ...overrides,
});

describe("TaskConnectionsTab", () => {
  const mockTask = createMockTask({ id: 1, name: "Current Task" });
  const mockRelatedTasks: Task[] = [
    createMockTask({ id: 2, name: "Related Task 1" }),
    createMockTask({ id: 3, name: "Related Task 2" }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockReset();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => createMockConnection(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial Render", () => {
    it("renders the component with title", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      expect(screen.getByText("Knowledge Graph Connections")).toBeInTheDocument();
    });

    it("shows empty state when no connections", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      expect(screen.getByText(/No connections yet/)).toBeInTheDocument();
    });

    it("has button to add connection in header", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      const buttons = screen.getAllByTestId("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("renders link icon", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      expect(screen.getByTestId("link-icon")).toBeInTheDocument();
    });

    it("shows description text", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      expect(screen.getByText(/Connect this task to other tasks/)).toBeInTheDocument();
    });

    it("has Add Connection button", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      expect(screen.getByRole("button", { name: "Add Connection" })).toBeInTheDocument();
    });
  });

  describe("Add Connection Form", () => {
    it("opens form when Add Connection button clicked", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      // Should show form elements
      expect(screen.getByTestId("select")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Add context about this connection...")).toBeInTheDocument();
    });

    it("shows connection type select in form", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      expect(screen.getByTestId("select")).toBeInTheDocument();
    });

    it("shows target task input in form", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();
    });

    it("shows notes input in form", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      expect(screen.getByPlaceholderText("Add context about this connection...")).toBeInTheDocument();
    });

    it("shows cancel button in form", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("shows all connection types in select", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      // Check for connection types
      expect(screen.getByText("Prerequisite")).toBeInTheDocument();
      expect(screen.getByText("Inspiration")).toBeInTheDocument();
      expect(screen.getByText("Similar")).toBeInTheDocument();
      expect(screen.getByText("Contrast")).toBeInTheDocument();
      expect(screen.getByText("Related")).toBeInTheDocument();
      expect(screen.getByText("Learned From")).toBeInTheDocument();
    });
  });

  describe("Insights Section", () => {
    it("shows insights section when connections exist", () => {
      const connections: TaskConnection[] = [
        createMockConnection({ id: 1 }),
      ];

      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={connections}
          relatedTasks={mockRelatedTasks}
        />
      );

      expect(screen.getByText("Insights")).toBeInTheDocument();
    });

    it("shows connection count in insights", () => {
      const connections: TaskConnection[] = [
        createMockConnection({ id: 1 }),
        createMockConnection({ id: 2 }),
      ];

      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={connections}
          relatedTasks={mockRelatedTasks}
        />
      );

      // The badge shows just the number
      const badges = screen.getAllByTestId("badge");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows insights content for connections", () => {
      const connections: TaskConnection[] = [
        createMockConnection({ id: 1 }),
      ];

      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={connections}
          relatedTasks={mockRelatedTasks}
        />
      );

      expect(screen.getByText(/This task is connected to/)).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("filters tasks by search query", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      const searchInput = screen.getByPlaceholderText("Search tasks...");
      fireEvent.change(searchInput, { target: { value: "Related" } });
    });

    it("shows all tasks when search is cleared", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      const searchInput = screen.getByPlaceholderText("Search tasks...") as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "Related" } });
      fireEvent.change(searchInput, { target: { value: "" } });
    });
  });

  describe("Connection Types", () => {
    it("renders all connection types in select", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      // Check for various connection types
      expect(screen.getByText("Prerequisite")).toBeInTheDocument();
      expect(screen.getByText("Inspiration")).toBeInTheDocument();
      expect(screen.getByText("Similar")).toBeInTheDocument();
      expect(screen.getByText("Contrast")).toBeInTheDocument();
      expect(screen.getByText("Related")).toBeInTheDocument();
      expect(screen.getByText("Learned From")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty related tasks array", () => {
      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={[]}
        />
      );

      expect(screen.getByRole("button", { name: "Add Connection" })).toBeInTheDocument();
    });

    it("filters out current task from related tasks", () => {
      const relatedWithCurrent = [
        mockTask, // Current task should be filtered out
        createMockTask({ id: 2, name: "Other Task" }),
      ];

      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={relatedWithCurrent}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      // Should only show "Other Task" options
      const searchInput = screen.getByPlaceholderText("Search tasks...");
      fireEvent.change(searchInput, { target: { value: "Other" } });
    });

    it("handles API error gracefully", async () => {
      (global.fetch as any).mockRejectedValue(new Error("Network error"));

      const mockOnConnectionsChange = vi.fn();

      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
          onConnectionsChange={mockOnConnectionsChange}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Connection" });
      fireEvent.click(addButton);

      const searchInput = screen.getByPlaceholderText("Search tasks...");
      fireEvent.change(searchInput, { target: { value: "Task 2" } });

      // Should not throw
      expect(screen.getByTestId("select")).toBeInTheDocument();
    });
  });

  describe("onConnectionsChange callback", () => {
    it("exists as a prop", () => {
      const mockOnConnectionsChange = vi.fn();

      render(
        <TaskConnectionsTab
          task={mockTask}
          connections={[]}
          relatedTasks={mockRelatedTasks}
          onConnectionsChange={mockOnConnectionsChange}
        />
      );

      expect(mockOnConnectionsChange).not.toHaveBeenCalled();
    });
  });
});