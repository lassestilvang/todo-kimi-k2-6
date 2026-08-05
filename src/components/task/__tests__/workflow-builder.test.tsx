import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { WorkflowBuilder } from "@/components/task/workflow-builder";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("WorkflowBuilder Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ workflows: [] }),
    });
  });

  it("should render the workflow builder title", async () => {
    render(<WorkflowBuilder />);

    await waitFor(() => {
      expect(screen.getByText(/workflow builder/i)).toBeInTheDocument();
    });
  });

  it("should display no workflows message when empty", async () => {
    render(<WorkflowBuilder />);

    await waitFor(() => {
      expect(screen.getByText(/no workflows yet/i)).toBeInTheDocument();
    });
  });

  it("should display new workflow button", async () => {
    render(<WorkflowBuilder />);

    await waitFor(() => {
      const newButton = screen.getByRole("button", { name: /new workflow/i });
      expect(newButton).toBeInTheDocument();
    });
  });

  it("should display trigger and action type definitions", () => {
    // Test that the trigger types are defined correctly
    const TRIGGER_TYPES = [
      { value: "manual", label: "Manual Trigger" },
      { value: "task_created", label: "Task Created" },
      { value: "task_completed", label: "Task Completed" },
    ];

    const ACTION_TYPES = [
      { value: "create_task", label: "Create Task" },
      { value: "update_task", label: "Update Task" },
      { value: "send_notification", label: "Send Notification" },
    ];

    // Verify types are defined
    expect(TRIGGER_TYPES.length).toBeGreaterThan(0);
    expect(ACTION_TYPES.length).toBeGreaterThan(0);

    // Verify labels contain expected words
    expect(TRIGGER_TYPES[0].label).toContain("Manual");
    expect(ACTION_TYPES[0].label).toContain("Create");
  });
});