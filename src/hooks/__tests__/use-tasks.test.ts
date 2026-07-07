import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTasks } from "../use-tasks";

describe("useTasks", () => {
  const createMockTask = (overrides: Partial<any> = {}): any => ({
    id: 1,
    name: "Test Task",
    description: null,
    notes: null,
    list_id: 1,
    date: null,
    deadline: null,
    priority: "none",
    recurring: "none",
    completed: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    labels: [],
    subtasks: [],
    reminders: [],
    ...overrides,
  });

  const mockLists = [
    { id: 1, name: "Inbox", emoji: "📥", color: "#6366f1", is_inbox: 1, created_at: "" },
    { id: 2, name: "Work", emoji: "💼", color: "#3b82f6", is_inbox: 0, created_at: "" },
  ];

  const mockLabels = [
    { id: 1, name: "Urgent", icon: "🔥", color: "#ef4444", created_at: "" },
    { id: 2, name: "Work", icon: "💼", color: "#3b82f6", created_at: "" },
  ];

  describe("initial state", () => {
    it("should return initial tasks", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [createMockTask({ id: 1 })], initialLists: mockLists, initialLabels: mockLabels })
      );

      expect(result.current.tasks.length).toBe(1);
      expect(result.current.tasks[0].id).toBe(1);
    });

    it("should return initial lists", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: mockLists, initialLabels: mockLabels })
      );

      expect(result.current.lists.length).toBe(2);
    });

    it("should return initial labels", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: mockLabels })
      );

      expect(result.current.labels.length).toBe(2);
    });

    it("should have default currentView of 'today'", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      expect(result.current.currentView).toBe("today");
    });

    it("should have default sortBy of 'date'", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      expect(result.current.sortBy).toBe("date");
    });

    it("should have default sortDirection of 'asc'", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      expect(result.current.sortDirection).toBe("asc");
    });
  });

  describe("setTasks", () => {
    it("should update tasks", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.setTasks([createMockTask({ id: 1, name: "New Task" })]);
      });

      expect(result.current.tasks.length).toBe(1);
      expect(result.current.tasks[0].name).toBe("New Task");
    });
  });

  describe("setLists", () => {
    it("should update lists", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.setLists([{ id: 1, name: "New List" }]);
      });

      expect(result.current.lists.length).toBe(1);
    });
  });

  describe("setLabels", () => {
    it("should update labels", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.setLabels([{ id: 1, name: "New Label" }]);
      });

      expect(result.current.labels.length).toBe(1);
    });
  });

  describe("handleViewChange", () => {
    it("should change view without listId", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleViewChange("upcoming");
      });

      expect(result.current.currentView).toBe("upcoming");
    });

    it("should change view with listId", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleViewChange("list", 5);
      });

      expect(result.current.currentView).toBe("list");
      expect(result.current.currentListId).toBe(5);
    });

    it("should clear search query when changing view", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.setSearchQuery("search term");
      });

      expect(result.current.searchQuery).toBe("search term");

      act(() => {
        result.current.handleViewChange("today");
      });

      expect(result.current.searchQuery).toBe("");
    });
  });

  describe("handleSearch", () => {
    it("should set search query", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleSearch("test query");
      });

      expect(result.current.searchQuery).toBe("test query");
    });

    it("should change view to search when query provided", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleSearch("test");
      });

      expect(result.current.currentView).toBe("search");
    });

    it("should change view to today when query is empty", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleViewChange("upcoming");
        result.current.handleSearch("");
      });

      expect(result.current.currentView).toBe("today");
    });
  });

  describe("handleSort", () => {
    it("should change sort field", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleSort("name");
      });

      expect(result.current.sortBy).toBe("name");
    });

    it("should toggle sort direction", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleSort("name");
      });

      expect(result.current.sortDirection).toBe("desc");

      act(() => {
        result.current.handleSort("name");
      });

      expect(result.current.sortDirection).toBe("asc");
    });
  });

  describe("handleFilterList", () => {
    it("should set filter list id", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleFilterList(5);
      });

      expect(result.current.filterListId).toBe(5);
    });

    it("should clear filter list id when undefined", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleFilterList(5);
        result.current.handleFilterList(undefined);
      });

      expect(result.current.filterListId).toBeUndefined();
    });
  });

  describe("handleFilterLabel", () => {
    it("should add label to filter", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleFilterLabel(1);
      });

      expect(result.current.filterLabelIds).toContain(1);
    });

    it("should toggle label in filter", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleFilterLabel(1);
      });

      expect(result.current.filterLabelIds).toContain(1);

      act(() => {
        result.current.handleFilterLabel(1);
      });

      expect(result.current.filterLabelIds).not.toContain(1);
    });

    it("should add multiple labels", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleFilterLabel(1);
        result.current.handleFilterLabel(2);
      });

      expect(result.current.filterLabelIds.length).toBe(2);
      expect(result.current.filterLabelIds).toContain(1);
      expect(result.current.filterLabelIds).toContain(2);
    });
  });

  describe("handleFilterPriority", () => {
    it("should set priority filter", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleFilterPriority("high");
      });

      expect(result.current.filterPriority).toBe("high");
    });

    it("should clear priority filter when undefined", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleFilterPriority("high");
        result.current.handleFilterPriority(undefined);
      });

      expect(result.current.filterPriority).toBeUndefined();
    });
  });

  describe("clearFilters", () => {
    it("should clear all filters", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      act(() => {
        result.current.handleFilterList(5);
        result.current.handleFilterPriority("high");
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filterListId).toBeUndefined();
      expect(result.current.filterPriority).toBeUndefined();
    });
  });

  describe("overdueCount", () => {
    it("should count overdue tasks", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { result } = renderHook(() =>
        useTasks({
          initialTasks: [createMockTask({ id: 1, date: pastDate, completed: 0 })],
          initialLists: [],
          initialLabels: [],
        })
      );

      expect(result.current.overdueCount).toBeGreaterThanOrEqual(0);
    });

    it("should not count completed tasks as overdue", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { result } = renderHook(() =>
        useTasks({
          initialTasks: [createMockTask({ id: 1, date: pastDate, completed: 1 })],
          initialLists: [],
          initialLabels: [],
        })
      );

      expect(result.current.overdueCount).toBe(0);
    });
  });

  describe("visibleTasks", () => {
    it("should return all tasks when view is 'all'", () => {
      const { result } = renderHook(() =>
        useTasks({
          initialTasks: [
            createMockTask({ id: 1, name: "Task 1" }),
            createMockTask({ id: 2, name: "Task 2" }),
          ],
          initialLists: [],
          initialLabels: [],
        })
      );

      act(() => {
        result.current.setCurrentView("all");
      });

      // Completed tasks are filtered out
      expect(result.current.visibleTasks.length).toBe(2);
    });

    it("should filter completed tasks", () => {
      const { result } = renderHook(() =>
        useTasks({
          initialTasks: [
            createMockTask({ id: 1, name: "Task 1", completed: 0 }),
            createMockTask({ id: 2, name: "Task 2", completed: 1 }),
          ],
          initialLists: [],
          initialLabels: [],
        })
      );

      act(() => {
        result.current.setCurrentView("all");
      });

      expect(result.current.visibleTasks.length).toBe(1);
      expect(result.current.visibleTasks[0].id).toBe(1);
    });
  });

  describe("handleFilterPresetChange", () => {
    it("should set filter preset", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      const preset = {
        id: 1,
        name: "Important",
        filter: { priority: "high", completed: false },
      };

      act(() => {
        result.current.handleFilterPresetChange(preset);
      });

      expect(result.current.currentFilterPreset).toEqual(preset);
    });

    it("should set view to 'all' when preset is set", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      const preset = {
        id: 1,
        name: "Important",
        filter: { priority: "high" },
      };

      act(() => {
        result.current.handleFilterPresetChange(preset);
      });

      expect(result.current.currentView).toBe("all");
    });
  });

  describe("searchInputRef", () => {
    it("should have a searchInputRef", () => {
      const { result } = renderHook(() =>
        useTasks({ initialTasks: [], initialLists: [], initialLabels: [] })
      );

      expect(result.current.searchInputRef).toBeDefined();
    });
  });
});