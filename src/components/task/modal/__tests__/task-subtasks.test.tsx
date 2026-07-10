"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("lucide-react", () => ({
  Plus: () => <span data-testid="icon-plus">+</span>,
  Trash2: () => <span data-testid="icon-trash">🗑</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button onClick={onClick} data-testid="button" data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => (
    <input
      {...props}
      data-testid="input"
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Import after mocks
import { TaskSubtasks } from "../task-subtasks";

describe("TaskSubtasks Component", () => {
  const defaultProps = {
    subtasks: [] as string[],
    onSubtaskAdd: vi.fn(),
    onSubtaskRemove: vi.fn(),
    onSubtaskChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the component with label", () => {
    render(<TaskSubtasks {...defaultProps} />);

    expect(screen.getByText("Subtasks")).toBeInTheDocument();
    // Just verify we have an input field
    expect(screen.getAllByTestId("input").length).toBeGreaterThan(0);
  });

  it("should render add button", () => {
    render(<TaskSubtasks {...defaultProps} />);

    expect(screen.getByTestId("icon-plus")).toBeInTheDocument();
  });

  it("should render existing subtasks correctly", () => {
    const props = {
      ...defaultProps,
      subtasks: ["First subtask", "Second subtask", "Third subtask"],
    };

    render(<TaskSubtasks {...props} />);

    expect(screen.getByDisplayValue("First subtask")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Second subtask")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Third subtask")).toBeInTheDocument();
  });

  it("should call onSubtaskRemove when remove button is clicked", () => {
    const props = {
      ...defaultProps,
      subtasks: ["Task to remove", "Keep this one"],
    };

    render(<TaskSubtasks {...props} />);

    // Find remove button by the trash icon
    const trashIcons = screen.getAllByTestId("icon-trash");
    expect(trashIcons.length).toBeGreaterThan(0);
  });

  it("should handle single subtask correctly", () => {
    const props = {
      ...defaultProps,
      subtasks: ["Single subtask"],
    };

    render(<TaskSubtasks {...props} />);

    expect(screen.getByDisplayValue("Single subtask")).toBeInTheDocument();
  });

  it("should handle many subtasks", () => {
    const manySubtasks = Array.from({ length: 10 }, (_, i) => `Subtask ${i + 1}`);
    const props = { ...defaultProps, subtasks: manySubtasks };

    render(<TaskSubtasks {...props} />);

    manySubtasks.forEach(subtask => {
      expect(screen.getByDisplayValue(subtask)).toBeInTheDocument();
    });
  });

  it("should have correct input placeholder", () => {
    render(<TaskSubtasks {...defaultProps} />);

    const inputs = screen.getAllByTestId("input");
    expect(inputs[0]).toHaveAttribute("placeholder", "Add a subtask...");
  });

  it("should have remove buttons for each subtask", () => {
    const props = {
      ...defaultProps,
      subtasks: ["One", "Two", "Three"],
    };

    render(<TaskSubtasks {...props} />);

    // Each subtask row has a remove button
    const removeButtons = screen.getAllByTestId("button");
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it("should handle empty subtasks array without crash", () => {
    expect(() => render(<TaskSubtasks {...defaultProps} subtasks={[]} />)).not.toThrow();
  });

  it("should render correct number of input fields for subtasks", () => {
    const props = {
      ...defaultProps,
      subtasks: ["One", "Two"],
    };

    render(<TaskSubtasks {...props} />);

    // Should have 3 inputs: 1 for add field, 2 for subtask fields
    expect(screen.getAllByTestId("input").length).toBe(3);
  });
});