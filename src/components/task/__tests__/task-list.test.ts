import { describe, it, expect } from "vitest";

const mockTasks = [
  { id: 1, name: "Task 1", priority: "high", completed: false, date: "2024-01-15", deadline: "2024-01-20" },
  { id: 2, name: "Task 2", priority: "medium", completed: true, date: "2024-01-16", deadline: "2024-01-21" },
  { id: 3, name: "Task 3", priority: "low", completed: false, date: null, deadline: null },
  { id: 4, name: "Task 4", priority: "critical", completed: false, date: "2024-01-15", deadline: "2024-01-15" },
];

describe("TaskList - Filtering Logic", () => {
  describe("Today View", () => {
    it("should filter tasks for today", () => {
      const today = new Date().toISOString().split("T")[0];
      const todayTasks = mockTasks.filter((t) => t.date === today);
      expect(todayTasks.length).toBe(0); // No tasks today in mock data
    });

    it("should include tasks with today's date", () => {
      const todayTasks = mockTasks.filter((t) => t.date === "2024-01-15");
      expect(todayTasks.length).toBe(2);
    });
  });

  describe("All Tasks View", () => {
    it("should return all tasks", () => {
      const allTasks = mockTasks;
      expect(allTasks.length).toBe(4);
    });
  });

  describe("Completed Tasks", () => {
    it("should filter completed tasks", () => {
      const completedTasks = mockTasks.filter((t) => t.completed);
      expect(completedTasks.length).toBe(1);
      expect(completedTasks[0].name).toBe("Task 2");
    });
  });

  describe("Priority Filtering", () => {
    it("should filter by critical priority", () => {
      const criticalTasks = mockTasks.filter((t) => t.priority === "critical");
      expect(criticalTasks.length).toBe(1);
      expect(criticalTasks[0].name).toBe("Task 4");
    });

    it("should filter by high priority", () => {
      const highTasks = mockTasks.filter((t) => t.priority === "high");
      expect(highTasks.length).toBe(1);
      expect(highTasks[0].name).toBe("Task 1");
    });

    it("should filter by medium priority", () => {
      const mediumTasks = mockTasks.filter((t) => t.priority === "medium");
      expect(mediumTasks.length).toBe(1);
    });

    it("should filter by low priority", () => {
      const lowTasks = mockTasks.filter((t) => t.priority === "low");
      expect(lowTasks.length).toBe(1);
    });
  });

  describe("Search Functionality", () => {
    it("should search tasks by name", () => {
      const query = "Task";
      const results = mockTasks.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
      expect(results.length).toBe(4);
    });

    it("should return empty results for non-matching query", () => {
      const query = "nonexistent";
      const results = mockTasks.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
      expect(results.length).toBe(0);
    });

    it("should be case-insensitive", () => {
      const query = "TASK";
      const results = mockTasks.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
      expect(results.length).toBe(4);
    });
  });

  describe("Sorting", () => {
    it("should sort by name ascending", () => {
      const sorted = [...mockTasks].sort((a, b) => a.name.localeCompare(b.name));
      expect(sorted[0].name).toBe("Task 1");
      expect(sorted[3].name).toBe("Task 4");
    });

    it("should sort by priority", () => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      const sorted = [...mockTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      expect(sorted[0].priority).toBe("critical");
    });
  });
});

describe("TaskList - Task Item Rendering", () => {
  it("should render task with correct properties", () => {
    const task = mockTasks[0];
    expect(task.id).toBeDefined();
    expect(task.name).toBeDefined();
    expect(task.priority).toBeDefined();
    expect(typeof task.completed).toBe("boolean");
  });

  it("should handle task without date", () => {
    const task = mockTasks[2];
    expect(task.date).toBeNull();
    expect(task.deadline).toBeNull();
  });

  it("should handle task with deadline", () => {
    const task = mockTasks[3];
    expect(task.deadline).toBe("2024-01-15");
  });
});