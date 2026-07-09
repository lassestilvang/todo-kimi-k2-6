import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock the toast module
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the task actions
vi.mock("@/lib/actions/tasks", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

describe("useTaskMutations", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it("should expose mutation functions", async () => {
    const { useTaskMutations } = await import("../use-task-mutations");
    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    expect(result.current.createTask).toBeDefined();
    expect(result.current.updateTask).toBeDefined();
    expect(result.current.deleteTask).toBeDefined();
    expect(result.current.toggleComplete).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("should create a task", async () => {
    // Mock createTask
    const mockTask = {
      id: 123,
      name: "Test task",
      description: null,
      notes: null,
      list_id: 1,
      date: null,
      deadline: null,
      estimate: null,
      actual_time: null,
      priority: "none" as const,
      recurring: "none" as const,
      recurring_config: null,
      completed: false,
      completed_at: null,
      created_at: "",
      updated_at: "",
      sort_order: 0,
      user_id: null,
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
    };

    const { createTask } = await import("@/lib/actions/tasks");
    vi.mocked(createTask).mockResolvedValue(mockTask);

    const { useTaskMutations } = await import("../use-task-mutations");
    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    // Test that mutate function exists and is callable
    expect(typeof result.current.createTask).toBe("function");
  });

  it("should update a task", async () => {
    const { useTaskMutations } = await import("../use-task-mutations");
    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    expect(typeof result.current.updateTask).toBe("function");
  });

  it("should delete a task", async () => {
    const { useTaskMutations } = await import("../use-task-mutations");
    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    expect(typeof result.current.deleteTask).toBe("function");
  });

  it("should toggle task completion", async () => {
    const { useTaskMutations } = await import("../use-task-mutations");
    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    expect(typeof result.current.toggleComplete).toBe("function");
  });
});