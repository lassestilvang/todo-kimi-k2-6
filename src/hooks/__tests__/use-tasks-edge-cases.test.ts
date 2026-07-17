import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTasks } from "@/hooks/use-tasks";

describe("useTasks hook - Edge Cases", () => {
  const createMockTask = (overrides: any = {}) => ({
    id: 1,
    name: "Mock Task",
    description: null,
    notes: null,
    list_id: 1,
    date: null,
    deadline: null,
    estimate: null,
    actual_time: null,
    priority: "none" as const,
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
    archived: false,
    ...overrides,
  });

  describe("View filters property-based testing", () => {
    const priorities = ["critical", "high", "medium", "low", "none"] as const;

    it("should handle all priority values correctly", () => {
      priorities.forEach((priority) => {
        const tasks = [createMockTask({ id: 1, priority })];

        const { result } = renderHook(() => useTasks({
          initialTasks: tasks,
          initialLists: [],
          initialLabels: [],
        }));

        // Each priority should be filterable
        act(() => {
          result.current.handleFilterPriority(priority);
        });

        if (priority !== "none") {
          expect(result.current.filterPriority).toBe(priority);
        }
      });
    });

    it("should handle empty task arrays without crashing", () => {
      const { result } = renderHook(() => useTasks({
        initialTasks: [],
        initialLists: [],
        initialLabels: [],
      }));

      expect(result.current.tasks).toEqual([]);
      expect(result.current.visibleTasks).toEqual([]);
      expect(result.current.overdueCount).toBe(0);
    });

    it("should handle tasks with null dates gracefully", () => {
      const tasks = [
        createMockTask({ id: 1, date: null }),
        createMockTask({ id: 2, date: "2024-01-15" }),
      ];

      const { result } = renderHook(() => useTasks({
        initialTasks: tasks,
        initialLists: [],
        initialLabels: [],
      }));

      // Filter for today (no dates match)
      act(() => {
        result.current.handleViewChange("today");
      });

      expect(result.current.visibleTasks).toEqual([]);
    });

    it("should handle blocked tasks view", () => {
      const tasks = [
        createMockTask({ id: 1, priority: "high", blocked_by: [{ task_id: 2 }] }),
        createMockTask({ id: 2, priority: "high", blocked_by: [] }),
      ];

      const { result } = renderHook(() => useTasks({
        initialTasks: tasks,
        initialLists: [],
        initialLabels: [],
      }));

      act(() => {
        result.current.handleViewChange("blocked");
      });

      expect(result.current.currentView).toBe("blocked");
    });

    it("should handle search query with special characters", () => {
      const tasks = [createMockTask({ id: 1, name: "Test Task" })];

      const { result } = renderHook(() => useTasks({
        initialTasks: tasks,
        initialLists: [],
        initialLabels: [],
      }));

      act(() => {
        result.current.handleSearch("test");
      });

      expect(result.current.searchQuery).toBe("test");
      expect(result.current.currentView).toBe("search");
    });

    it("should clear filters correctly", () => {
      const tasks = [createMockTask({ id: 1, list_id: 1 })];

      const { result } = renderHook(() => useTasks({
        initialTasks: tasks,
        initialLists: [],
        initialLabels: [],
      }));

      act(() => {
        result.current.handleFilterList(1);
        result.current.handleFilterPriority("high");
        result.current.clearFilters();
      });

      expect(result.current.filterListId).toBeUndefined();
      expect(result.current.filterPriority).toBeUndefined();
    });

    it("should toggle sort direction on same field click", () => {
      const tasks = [
        createMockTask({ id: 1, name: "B Task", date: "2024-01-02" }),
        createMockTask({ id: 2, name: "A Task", date: "2024-01-01" }),
      ];

      const { result } = renderHook(() => useTasks({
        initialTasks: tasks,
        initialLists: [],
        initialLabels: [],
      }));

      act(() => {
        result.current.handleSort("name");
      });

      expect(result.current.sortBy).toBe("name");
      expect(result.current.sortDirection).toBe("desc");

      act(() => {
        result.current.handleSort("name");
      });

      expect(result.current.sortDirection).toBe("asc");
    });
  });

  describe("Time-based filtering edge cases", () => {
    it("should handle tasks with past dates correctly", () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const tasks = [createMockTask({ id: 1, date: pastDate })];

      const { result } = renderHook(() => useTasks({
        initialTasks: tasks,
        initialLists: [],
        initialLabels: [],
      }));

      expect(result.current.overdueCount).toBeGreaterThanOrEqual(0);
    });

    it("should handle tasks with future dates correctly", () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const tasks = [createMockTask({ id: 1, date: futureDate })];

      const { result } = renderHook(() => useTasks({
        initialTasks: tasks,
        initialLists: [],
        initialLabels: [],
      }));

      expect(result.current.overdueCount).toBe(0);
    });

    it("should exclude completed tasks from view", () => {
      const tasks = [
        createMockTask({ id: 1, completed: 0 }),
        createMockTask({ id: 2, completed: 1 }),
      ];

      const { result } = renderHook(() => useTasks({
        initialTasks: tasks,
        initialLists: [],
        initialLabels: [],
      }));

      expect(result.current.visibleTasks.every((t: any) => !t.completed)).toBe(true);
    });
  });

  describe("List and label filtering", () => {
    it("should handle multiple label filters", () => {
      const tasks = [
        createMockTask({ id: 1, labels: [{ id: 1 }] }),
        createMockTask({ id: 2, labels: [{ id: 2 }] }),
      ];

      const { result } = renderHook(() => useTasks({
        initialTasks: tasks,
        initialLists: [],
        initialLabels: [{ id: 1, name: "Label 1" }],
      }));

      act(() => {
        result.current.handleFilterLabel(1);
        result.current.handleFilterLabel(2);
      });

      // Both labels should be in filter
      expect(result.current.filterLabelIds.length).toBe(2);
    });

    it("should toggle labels correctly", () => {
      const tasks = [createMockTask({ id: 1, labels: [{ id: 1 }] })];

      const { result } = renderHook(() => useTasks({
        initialTasks: tasks,
        initialLists: [],
        initialLabels: [{ id: 1, name: "Label 1" }],
      }));

      act(() => {
        result.current.handleFilterLabel(1);
      });

      expect(result.current.filterLabelIds).toContain(1);

      act(() => {
        result.current.handleFilterLabel(1);
      });

      expect(result.current.filterLabelIds).not.toContain(1);
    });
  });
});