"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock the UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ id, value, onChange, placeholder }: any) => (
    <input id={id} value={value} onChange={onChange} placeholder={placeholder} data-testid="input" />
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ id, value, onChange }: any) => (
    <textarea id={id} value={value} onChange={onChange} data-testid="textarea" />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}));

// Import after mocks
import { TaskBasicInfo } from "../task-basic-info";

describe("TaskBasicInfo Component", () => {
  const defaultProps = {
    name: "Test Task",
    description: "A test description",
    notes: "Test notes in markdown",
    priority: "medium" as const,
    recurring: "none" as const,
    onNameChange: vi.fn(),
    onDescriptionChange: vi.fn(),
    onNotesChange: vi.fn(),
    onPriorityChange: vi.fn(),
    onRecurringChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all input fields", () => {
    render(<TaskBasicInfo {...defaultProps} />);

    // Check that inputs and textareas are rendered
    expect(screen.getAllByTestId("input").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("textarea").length).toBe(2); // description and notes
    expect(screen.getByText("Task Name")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Notes (Markdown supported)")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Recurring")).toBeInTheDocument();
  });

  it("should display provided task values", () => {
    render(<TaskBasicInfo {...defaultProps} />);

    const inputs = screen.getAllByTestId("input");
    expect(inputs[0]).toHaveValue("Test Task");

    const textareas = screen.getAllByTestId("textarea");
    expect(textareas[0]).toHaveValue("A test description");
    expect(textareas[1]).toHaveValue("Test notes in markdown");
  });

  it("should call onNameChange when name input changes", () => {
    render(<TaskBasicInfo {...defaultProps} />);

    const nameInput = screen.getAllByTestId("input")[0];
    fireEvent.change(nameInput, { target: { value: "New Task Name" } });

    expect(defaultProps.onNameChange).toHaveBeenCalledWith("New Task Name");
  });

  it("should call onDescriptionChange when description changes", () => {
    render(<TaskBasicInfo {...defaultProps} />);

    const descriptionTextarea = screen.getAllByTestId("textarea")[0];
    fireEvent.change(descriptionTextarea, { target: { value: "New description" } });

    expect(defaultProps.onDescriptionChange).toHaveBeenCalledWith("New description");
  });

  it("should call onNotesChange when notes change", () => {
    render(<TaskBasicInfo {...defaultProps} />);

    const notesTextarea = screen.getAllByTestId("textarea")[1];
    fireEvent.change(notesTextarea, { target: { value: "New notes" } });

    expect(defaultProps.onNotesChange).toHaveBeenCalledWith("New notes");
  });

  it("should call onPriorityChange when priority changes", () => {
    render(<TaskBasicInfo {...defaultProps} />);

    const prioritySelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(prioritySelect, { target: { value: "high" } });

    expect(defaultProps.onPriorityChange).toHaveBeenCalledWith("high");
  });

  it("should call onRecurringChange when recurring changes", () => {
    render(<TaskBasicInfo {...defaultProps} />);

    const recurringSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(recurringSelect, { target: { value: "daily" } });

    expect(defaultProps.onRecurringChange).toHaveBeenCalledWith("daily");
  });

  it("should have all priority options", () => {
    render(<TaskBasicInfo {...defaultProps} />);

    const prioritySelect = screen.getAllByRole("combobox")[0];
    const options = prioritySelect.querySelectorAll("option");

    expect(options).toHaveLength(5);
    expect(options[0]).toHaveValue("critical");
    expect(options[1]).toHaveValue("high");
    expect(options[2]).toHaveValue("medium");
    expect(options[3]).toHaveValue("low");
    expect(options[4]).toHaveValue("none");
  });

  it("should have all recurring options", () => {
    render(<TaskBasicInfo {...defaultProps} />);

    const recurringSelect = screen.getAllByRole("combobox")[1];
    const options = recurringSelect.querySelectorAll("option");

    expect(options).toHaveLength(7);
    expect(options[0]).toHaveValue("none");
    expect(options[1]).toHaveValue("daily");
    expect(options[2]).toHaveValue("weekly");
    expect(options[3]).toHaveValue("weekdays");
    expect(options[4]).toHaveValue("monthly");
    expect(options[5]).toHaveValue("yearly");
    expect(options[6]).toHaveValue("custom");
  });

  it("should handle empty values gracefully", () => {
    const emptyProps = {
      ...defaultProps,
      name: "",
      description: "",
      notes: "",
    };

    expect(() => render(<TaskBasicInfo {...emptyProps} />)).not.toThrow();
    expect(screen.getAllByTestId("input")[0]).toHaveValue("");
  });

  it("should handle all priority values", () => {
    const priorities = ["critical", "high", "medium", "low", "none"] as const;

    priorities.forEach((priority) => {
      const { unmount } = render(<TaskBasicInfo {...defaultProps} priority={priority} />);
      expect(screen.getAllByRole("combobox")[0]).toHaveValue(priority);
      unmount();
    });
  });

  it("should handle all recurring values", () => {
    const recurringOptions = ["none", "daily", "weekly", "weekdays", "monthly", "yearly", "custom"] as const;

    recurringOptions.forEach((recurring) => {
      const { unmount } = render(<TaskBasicInfo {...defaultProps} recurring={recurring} />);
      expect(screen.getAllByRole("combobox")[1]).toHaveValue(recurring);
      unmount();
    });
  });
});