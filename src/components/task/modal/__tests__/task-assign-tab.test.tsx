"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("lucide-react", () => ({
  X: () => <span data-testid="icon-x">×</span>,
  Plus: () => <span data-testid="icon-plus">+</span>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-testid="button" data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ placeholder, value, onChange }: any) => (
    <input placeholder={placeholder} value={value} onChange={onChange} data-testid="input" />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}));

// Import after mocks
import { TaskAssignTab } from "../task-assign-tab";

describe("TaskAssignTab Component", () => {
  const defaultProps = {
    assignees: [],
    assigneeSearchQuery: "",
    onAssigneeSearchChange: vi.fn(),
    onAssigneesChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the component with title and description", () => {
    render(<TaskAssignTab {...defaultProps} />);

    expect(screen.getByText("Task Assignment")).toBeInTheDocument();
    expect(screen.getByText(/Assign this task to team members/)).toBeInTheDocument();
  });

  it("should render empty assignees state", () => {
    render(<TaskAssignTab {...defaultProps} />);

    expect(screen.getByText(/Add assignee/)).toBeInTheDocument();
  });

  it("should render assignees when present", () => {
    const props = {
      ...defaultProps,
      assignees: [
        { user_id: 1, user_email: "user1@example.com", user_name: "User One", permission: "view" },
        { user_id: 2, user_email: "user2@example.com", user_name: "User Two", permission: "edit" },
      ],
    };

    render(<TaskAssignTab {...props} />);

    expect(screen.getByText("User One")).toBeInTheDocument();
    // User Two has user_name, so we should see it
    expect(screen.getByText("User Two")).toBeInTheDocument();
  });

  it("should call onAssigneeSearchChange when search input changes", () => {
    render(<TaskAssignTab {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Search users/);
    fireEvent.change(searchInput, { target: { value: "test query" } });

    expect(defaultProps.onAssigneeSearchChange).toHaveBeenCalledWith("test query");
  });

  it("should render remove button for each assignee", () => {
    const props = {
      ...defaultProps,
      assignees: [
        { user_id: 1, user_email: "user1@example.com", user_name: "User One", permission: "view" },
      ],
    };

    render(<TaskAssignTab {...props} />);

    // The remove button should be present (X icon)
    expect(screen.getByTestId("icon-x")).toBeInTheDocument();
  });

  it("should call onAssigneesChange when removing an assignee", () => {
    const props = {
      ...defaultProps,
      assignees: [
        { user_id: 1, user_email: "user1@example.com", user_name: "User One", permission: "view" },
      ],
    };

    render(<TaskAssignTab {...props} />);

    // Find the remove button by aria-label (contains "Remove")
    const removeButton = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(removeButton);

    expect(props.onAssigneesChange).toHaveBeenCalledWith([]);
  });

  it("should render permission hint text", () => {
    render(<TaskAssignTab {...defaultProps} />);

    // The tip contains special "edit" text
    expect(screen.getByText(/Tip:/)).toBeInTheDocument();
  });

  it("should handle assignee without user_name (show email)", () => {
    const props = {
      ...defaultProps,
      assignees: [
        { user_id: 1, user_email: "user1@example.com", user_name: null, permission: "view" as const },
      ],
    };

    render(<TaskAssignTab {...props} />);

    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
  });

  it("should handle empty assigneeSearchQuery", () => {
    render(<TaskAssignTab {...defaultProps} assigneeSearchQuery="" />);

    expect(screen.getByTestId("input")).toHaveValue("");
  });

  it("should handle search query with value", () => {
    render(<TaskAssignTab {...defaultProps} assigneeSearchQuery="searching" />);

    expect(screen.getByTestId("input")).toHaveValue("searching");
  });
});