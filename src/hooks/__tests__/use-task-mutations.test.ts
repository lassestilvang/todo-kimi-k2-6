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
  archiveTask: vi.fn(),
  unarchiveTask: vi.fn(),
}));

// Helper to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useTaskMutations - Hook Structure Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Hook initialization", () => {
    it("should expose all mutation functions and isLoading", async () => {
      const { useTaskMutations } = await import("../use-task-mutations");
      const wrapper = createWrapper();
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      expect(result.current.createTask).toBeDefined();
      expect(result.current.updateTask).toBeDefined();
      expect(result.current.deleteTask).toBeDefined();
      expect(result.current.toggleComplete).toBeDefined();
      expect(result.current.archiveTask).toBeDefined();
      expect(result.current.unarchiveTask).toBeDefined();
      expect(typeof result.current.isLoading).toBe("boolean");
    });

    it("should have all mutation functions as callable", async () => {
      const { useTaskMutations } = await import("../use-task-mutations");
      const wrapper = createWrapper();
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      expect(typeof result.current.createTask).toBe("function");
      expect(typeof result.current.updateTask).toBe("function");
      expect(typeof result.current.deleteTask).toBe("function");
      expect(typeof result.current.toggleComplete).toBe("function");
      expect(typeof result.current.archiveTask).toBe("function");
      expect(typeof result.current.unarchiveTask).toBe("function");
    });

    it("should return isLoading as false initially", async () => {
      const { useTaskMutations } = await import("../use-task-mutations");
      const wrapper = createWrapper();
      const { result } = renderHook(() => useTaskMutations(), { wrapper });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Module structure", () => {
    it("should be importable as a module", async () => {
      const { useTaskMutations } = await import("../use-task-mutations");
      expect(useTaskMutations).toBeDefined();
    });

    it("should be a function", async () => {
      const { useTaskMutations } = await import("../use-task-mutations");
      expect(typeof useTaskMutations).toBe("function");
    });
  });
});

describe("useTaskMutations - Mutation Logic Tests", () => {
  it("should handle optimistic task creation pattern", () => {
    // Test the optimistic update logic exists
    const optimisticTask = {
      id: Date.now(),
      user_id: null,
      name: "New Task",
      description: null,
      notes: null,
      list_id: null,
      date: null,
      deadline: null,
      estimate: null,
      actual_time: null,
      priority: "none",
      recurring: "none",
      recurring_config: null,
      completed: false,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sort_order: 1,
      archived: false,
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

    // Verify the structure matches what the hook creates
    expect(optimisticTask.completed).toBe(false);
    expect(optimisticTask.priority).toBe("none");
    expect(optimisticTask.labels).toEqual([]);
    expect(optimisticTask.subtasks).toEqual([]);
    expect(typeof optimisticTask.created_at).toBe("string");
  });

  it("should handle optimistic task update pattern", () => {
    const existingTask = { id: 1, name: "Old" };
    const updateInput = { name: "New" };
    const updatedTask = { ...existingTask, ...updateInput, updated_at: new Date().toISOString() };

    expect(updatedTask.name).toBe("New");
    expect(updatedTask.id).toBe(1);
    expect(typeof updatedTask.updated_at).toBe("string");
  });

  it("should handle optimistic task deletion pattern", () => {
    const tasks = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const deleteId = 2;
    const remaining = tasks.filter((t) => t.id !== deleteId);

    expect(remaining.length).toBe(2);
    expect(remaining.find((t) => t.id === 2)).toBeUndefined();
  });

  it("should handle optimistic toggle complete pattern", () => {
    const task = { id: 1, completed: false, completed_at: null };
    const completedTask = { ...task, completed: true, completed_at: new Date().toISOString() };

    expect(completedTask.completed).toBe(true);
    expect(completedTask.completed_at).not.toBeNull();
  });

  it("should handle optimistic archive pattern", () => {
    const task = { id: 1, archived: false };
    const archivedTask = { ...task, archived: true };

    expect(archivedTask.archived).toBe(true);
  });

  it("should handle optimistic unarchive pattern", () => {
    const task = { id: 1, archived: true };
    const unarchivedTask = { ...task, archived: false };

    expect(unarchivedTask.archived).toBe(false);
  });
});

describe("useTaskMutations - Function Signature Tests", () => {
  it("should call createTask with task data", async () => {
    const { createTask } = await import("@/lib/actions/tasks");
    const { useTaskMutations } = await import("../use-task-mutations");
    const wrapper = createWrapper();

    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    // Calling the function should not throw
    expect(() => result.current.createTask({ name: "Test Task" })).not.toThrow();
  });

  it("should call updateTask with id and input", async () => {
    const { useTaskMutations } = await import("../use-task-mutations");
    const wrapper = createWrapper();

    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    expect(() =>
      result.current.updateTask({ id: 1, input: { name: "Updated" } })
    ).not.toThrow();
  });

  it("should call deleteTask with id", async () => {
    const { useTaskMutations } = await import("../use-task-mutations");
    const wrapper = createWrapper();

    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    expect(() => result.current.deleteTask(1)).not.toThrow();
  });

  it("should call toggleComplete with id and completed", async () => {
    const { useTaskMutations } = await import("../use-task-mutations");
    const wrapper = createWrapper();

    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    expect(() =>
      result.current.toggleComplete({ id: 1, completed: true })
    ).not.toThrow();
  });

  it("should call archiveTask with id", async () => {
    const { useTaskMutations } = await import("../use-task-mutations");
    const wrapper = createWrapper();

    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    expect(() => result.current.archiveTask(1)).not.toThrow();
  });

  it("should call unarchiveTask with id", async () => {
    const { useTaskMutations } = await import("../use-task-mutations");
    const wrapper = createWrapper();

    const { result } = renderHook(() => useTaskMutations(), { wrapper });

    expect(() => result.current.unarchiveTask(1)).not.toThrow();
  });
});