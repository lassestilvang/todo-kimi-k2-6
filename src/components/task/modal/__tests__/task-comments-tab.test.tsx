"use client";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { TaskWithRelations, TaskComment } from "@/types";

// Mock dependencies
vi.mock("lucide-react", () => ({
  X: () => <span data-testid="icon-x">×</span>,
  Plus: () => <span data-testid="icon-plus">+</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, size }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" data-size={size}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ placeholder, value, onChange, onKeyDown }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      data-testid="input"
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/actions", () => ({
  addTaskComment: vi.fn().mockResolvedValue({ id: 1, task_id: 1, content: "test", created_at: new Date().toISOString() }),
}));

vi.mock("date-fns", () => ({
  format: (date: Date) => date.toISOString().split("T")[0],
  parseISO: (str: string) => new Date(str),
}));

const mockTask: TaskWithRelations = {
  id: 1,
  user_id: 1,
  name: "Test Task",
  description: null,
  notes: null,
  list_id: 1,
  date: null,
  deadline: null,
  estimate: null,
  actual_time: null,
  priority: "none",
  recurring: "none",
  recurring_config: null,
  completed: 0,
  completed_at: null,
  created_at: "",
  updated_at: "",
  sort_order: 0,
  labels: [],
  subtasks: [],
  reminders: [],
  logs: [],
  attachments: [],
  blockers: [],
  blocked_by: [],
};

const mockComments: TaskComment[] = [
  { id: 1, task_id: 1, content: "First comment", created_at: "2024-01-15T10:00:00Z" },
  { id: 2, task_id: 1, content: "Second comment", created_at: "2024-01-15T11:00:00Z" },
];

// Import after mocks
import { TaskCommentsTab } from "../task-comments-tab";

describe("TaskCommentsTab Component", () => {
  const defaultProps = {
    task: mockTask,
    comments: [],
    onCommentsChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the component with title", () => {
    render(<TaskCommentsTab {...defaultProps} />);

    expect(screen.getByText("Comments")).toBeInTheDocument();
  });

  it("should render empty state message when no comments", () => {
    render(<TaskCommentsTab {...defaultProps} comments={[]} />);

    expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
    expect(screen.getByText(/Be the first to comment/)).toBeInTheDocument();
  });

  it("should render comments when provided", () => {
    render(<TaskCommentsTab {...defaultProps} comments={mockComments} />);

    expect(screen.getByText("First comment")).toBeInTheDocument();
    expect(screen.getByText("Second comment")).toBeInTheDocument();
  });

  it("should render comment input field", () => {
    render(<TaskCommentsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Write a comment/);
    expect(input).toBeInTheDocument();
  });

  it("should call addTaskComment when send button is clicked", async () => {
    const { addTaskComment } = await import("@/lib/actions");

    render(<TaskCommentsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Write a comment/);
    const sendButton = screen.getByRole("button", { name: /Send/i });

    fireEvent.change(input, { target: { value: "New comment" } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(addTaskComment).toHaveBeenCalledWith(1, { content: "New comment" });
    });
  });

  it("should not add empty comment", async () => {
    const { addTaskComment } = await import("@/lib/actions");

    render(<TaskCommentsTab {...defaultProps} />);

    const sendButton = screen.getByRole("button", { name: /Send/i });
    fireEvent.click(sendButton);

    expect(addTaskComment).not.toHaveBeenCalled();
  });

  it("should call onCommentsChange after successful comment", async () => {
    render(<TaskCommentsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Write a comment/);
    const sendButton = screen.getByRole("button", { name: /Send/i });

    fireEvent.change(input, { target: { value: "New comment" } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(defaultProps.onCommentsChange).toHaveBeenCalled();
    });
  });

  it("should clear input after adding comment", async () => {
    render(<TaskCommentsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Write a comment/);
    const sendButton = screen.getByRole("button", { name: /Send/i });

    fireEvent.change(input, { target: { value: "New comment" } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  it("should show sending state when adding comment", async () => {
    const { addTaskComment } = await import("@/lib/actions");
    // Make the mock take time to resolve
    vi.mocked(addTaskComment).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ id: 1, task_id: 1, content: "test", created_at: "" }), 100)));

    render(<TaskCommentsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Write a comment/);
    const sendButton = screen.getByRole("button");

    fireEvent.change(input, { target: { value: "New comment" } });
    fireEvent.click(sendButton);

    // Check that button shows "Sending..." during the async operation
    expect(sendButton).toBeDisabled();
  });

  it("should handle Enter key for adding comment", async () => {
    const { addTaskComment } = await import("@/lib/actions");

    render(<TaskCommentsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Write a comment/);

    fireEvent.change(input, { target: { value: "Enter comment" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(addTaskComment).toHaveBeenCalledWith(1, { content: "Enter comment" });
    });
  });

  it("should handle comment with whitespace", async () => {
    const { addTaskComment } = await import("@/lib/actions");

    render(<TaskCommentsTab {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Write a comment/);
    const sendButton = screen.getByRole("button", { name: /Send/i });

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(sendButton);

    expect(addTaskComment).not.toHaveBeenCalled();
  });

  it("should render multiple comments correctly", () => {
    const manyComments = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      task_id: 1,
      content: `Comment ${i + 1}`,
      created_at: "2024-01-15T10:00:00Z",
    }));

    render(<TaskCommentsTab {...defaultProps} comments={manyComments} />);

    manyComments.forEach(comment => {
      expect(screen.getByText(comment.content)).toBeInTheDocument();
    });
  });
});