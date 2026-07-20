// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskDecisionTab } from "../task-decision-tab";
import type { Task, DecisionEntry } from "@/types";

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

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value, onChange, placeholder, rows }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      data-testid="textarea"
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>,
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
  Trash2: ({ className }: { className?: string }) => <span className={className} data-testid="trash-icon">🗑️</span>,
  Edit: ({ className }: { className?: string }) => <span className={className} data-testid="edit-icon">✏️</span>,
  Check: ({ className }: { className?: string }) => <span className={className} data-testid="check-icon">✓</span>,
  X: ({ className }: { className?: string }) => <span className={className} data-testid="x-icon">X</span>,
  Star: ({ className }: { className?: string }) => <span className={className} data-testid="star-icon">⭐</span>,
  CheckCircle2: ({ className }: { className?: string }) => <span className={className} data-testid="check-circle-icon">✓</span>,
  MoreVertical: ({ className }: { className?: string }) => <span className={className} data-testid="more-icon">⋯</span>,
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

const createMockDecision = (overrides: Partial<DecisionEntry> = {}): DecisionEntry => ({
  id: 1,
  task_id: 1,
  user_id: 1,
  decision_type: "approach",
  question: "What approach should we take?",
  chosen_option_id: null,
  rationale: "Need to think about this",
  outcome: null,
  outcome_notes: null,
  outcome_rating: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
  options: [],
  ...overrides,
});

describe("TaskDecisionTab", () => {
  const mockTask = createMockTask({ id: 1, name: "Test Task" });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockReset();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => createMockDecision(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial Render", () => {
    it("renders the component with title", () => {
      render(
        <TaskDecisionTab
          task={mockTask}
        />
      );

      expect(screen.getByText("Decision Journal")).toBeInTheDocument();
    });

    it("has Add Decision button", () => {
      render(
        <TaskDecisionTab
          task={mockTask}
        />
      );

      expect(screen.getByRole("button", { name: "Add Decision" })).toBeInTheDocument();
    });

    it("shows empty state when no decisions", () => {
      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={[]}
        />
      );

      expect(screen.getByText(/No decisions recorded yet/)).toBeInTheDocument();
    });
  });

  describe("Add Decision Form", () => {
    it("opens form when Add Decision button clicked", () => {
      render(
        <TaskDecisionTab
          task={mockTask}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Decision" });
      fireEvent.click(addButton);

      expect(screen.getByTestId("select")).toBeInTheDocument();
    });

    it("shows question input in form", () => {
      render(
        <TaskDecisionTab
          task={mockTask}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Decision" });
      fireEvent.click(addButton);

      expect(screen.getByPlaceholderText("What decision are you making?")).toBeInTheDocument();
    });

    it("shows rationale textarea in form", () => {
      render(
        <TaskDecisionTab
          task={mockTask}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Decision" });
      fireEvent.click(addButton);

      expect(screen.getByPlaceholderText("Why are you making this decision?")).toBeInTheDocument();
    });

    it("shows cancel button in form", () => {
      render(
        <TaskDecisionTab
          task={mockTask}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Decision" });
      fireEvent.click(addButton);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("Decision Types", () => {
    it("renders all decision types in select", () => {
      render(
        <TaskDecisionTab
          task={mockTask}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Decision" });
      fireEvent.click(addButton);

      expect(screen.getByText("Priority Decision")).toBeInTheDocument();
      expect(screen.getByText("Approach Decision")).toBeInTheDocument();
      expect(screen.getByText("Tool Selection")).toBeInTheDocument();
      expect(screen.getByText("Timeline Decision")).toBeInTheDocument();
      expect(screen.getByText("Resource Allocation")).toBeInTheDocument();
      expect(screen.getByText("Cancellation Decision")).toBeInTheDocument();
    });
  });

  describe("Existing Decisions Display", () => {
    it("displays existing decisions", () => {
      const decisions: DecisionEntry[] = [
        createMockDecision({ id: 1, question: "Should we proceed?", rationale: "Yes, it's a good idea" }),
      ];

      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={decisions}
        />
      );

      expect(screen.getByText("Should we proceed?")).toBeInTheDocument();
    });

    it("shows decision rationale", () => {
      const decisions: DecisionEntry[] = [
        createMockDecision({ id: 1, question: "Test question", rationale: "Test rationale" }),
      ];

      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={decisions}
        />
      );

      expect(screen.getByText("Test rationale")).toBeInTheDocument();
    });

    it("shows decision type badge", () => {
      const decisions: DecisionEntry[] = [
        createMockDecision({ id: 1, decision_type: "approach" }),
      ];

      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={decisions}
        />
      );

      expect(screen.getByText("Approach Decision")).toBeInTheDocument();
    });

    it("shows created date", () => {
      const decisions: DecisionEntry[] = [
        createMockDecision({ id: 1, created_at: "2024-01-15T10:00:00Z" }),
      ];

      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={decisions}
        />
      );

      // The date is rendered in the decision card
      expect(screen.getByText("1/15/2024")).toBeInTheDocument();
    });
  });

  describe("Decision Deletion", () => {
    it("has edit and delete buttons for decisions", () => {
      const decisions: DecisionEntry[] = [
        createMockDecision({ id: 1 }),
      ];

      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={decisions}
        />
      );

      // Edit button (with edit-icon test id)
      expect(screen.getByTestId("edit-icon")).toBeInTheDocument();
      // Trash icon (with trash-icon test id)
      expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
    });

    it("deletes decision when delete button clicked", async () => {
      const decisions: DecisionEntry[] = [
        createMockDecision({ id: 1 }),
      ];

      const mockOnDecisionsChange = vi.fn();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={decisions}
          onDecisionsChange={mockOnDecisionsChange}
        />
      );

      // Find the trash icon and click its parent button
      const trashIcon = screen.getByTestId("trash-icon");
      const button = trashIcon.closest("button");
      if (button) {
        fireEvent.click(button);
      }

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/decisions/1"),
          expect.objectContaining({ method: "DELETE" })
        );
      });
    });
  });

  describe("API Integration", () => {
    it("calls API when adding decision", async () => {
      const mockOnDecisionsChange = vi.fn();

      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={[]}
          onDecisionsChange={mockOnDecisionsChange}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Decision" });
      fireEvent.click(addButton);

      const questionInput = screen.getByPlaceholderText("What decision are you making?");
      fireEvent.change(questionInput, { target: { value: "Test decision question" } });

      const saveButton = screen.getByText("Save Decision");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty decisions array", () => {
      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={[]}
        />
      );

      expect(screen.getByRole("button", { name: "Add Decision" })).toBeInTheDocument();
    });

    it("handles null task", () => {
      const { container } = render(
        <TaskDecisionTab
          task={null as any}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it("does not add decision with empty question", async () => {
      const mockOnDecisionsChange = vi.fn();

      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={[]}
          onDecisionsChange={mockOnDecisionsChange}
        />
      );

      const addButton = screen.getByRole("button", { name: "Add Decision" });
      fireEvent.click(addButton);

      const saveButton = screen.getByText("Save Decision");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });
  });

  describe("onDecisionsChange callback", () => {
    it("exists as a prop", () => {
      const mockOnDecisionsChange = vi.fn();

      render(
        <TaskDecisionTab
          task={mockTask}
          decisions={[]}
          onDecisionsChange={mockOnDecisionsChange}
        />
      );

      expect(mockOnDecisionsChange).not.toHaveBeenCalled();
    });
  });
});